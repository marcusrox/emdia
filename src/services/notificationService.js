const Entry = require("../models/FinancialEntry");
const Notification = require("../models/Notification");
const NotificationPreference = require("../models/NotificationPreference");
const User = require("../models/User");
const { addMonths, currentCompetence, todayIso } = require("./dateService");
const { formatMoney } = require("./moneyService");
const { logError, logInfo, logWarn } = require("./operationalLogger");
const { createWhatsAppClient } = require("./whatsappClient");

const FINAL_STATUSES = new Set(["PAID", "RECEIVED", "CANCELLED"]);
const CONNECTED_WHATSAPP_STATES = new Set(["open", "opened", "connected", "working"]);

async function runNotificationCycle() {
  generatePendingNotifications();
  await sendPendingNotifications();
}

function generatePendingNotifications() {
  const users = User.listActive();
  users.forEach((user) => {
    const preferences = NotificationPreference.getOrCreate(user.id);
    if (!preferences.whatsapp_enabled || !user.phone_e164) return;

    generateDueReminders(user, preferences);
    generateOverdueReminders(user, preferences);
    generateDailySummary(user, preferences);
  });
}

function generateDueReminders(user, preferences) {
  const today = todayIso(user.timezone);
  const competence = currentCompetence(user.timezone);
  const nextCompetence = addMonths(competence, 1);
  const entries = [
    ...Entry.list(user, { competence }),
    ...Entry.list(user, { competence: nextCompetence }),
  ].filter((entry) => !FINAL_STATUSES.has(entry.status));

  NotificationPreference.offsetsFromPreference(preferences).forEach((offset) => {
    const targetDate = addDaysIso(today, offset);
    entries
      .filter((entry) => entry.due_date === targetDate)
      .forEach((entry) => {
        Notification.createPending({
          user_id: user.id,
          financial_entry_id: entry.id,
          channel: "WHATSAPP",
          event_type: offset === 0 ? "DUE_TODAY" : "DUE_REMINDER",
          scheduled_at: new Date().toISOString(),
          idempotency_key: `notification:${entry.id}:due:${targetDate}:${offset}`,
          payload: {
            to: user.phone_e164,
            message: buildEntryReminderMessage(entry, offset),
          },
        });
      });
  });
}

function generateOverdueReminders(user, preferences) {
  const today = todayIso(user.timezone);
  const competence = currentCompetence(user.timezone);
  const previousCompetence = addMonths(competence, -1);
  const interval = Math.max(Number(preferences.overdue_reminder_interval_days) || 3, 1);
  const entries = [
    ...Entry.list(user, { competence: previousCompetence }),
    ...Entry.list(user, { competence }),
  ].filter((entry) => entry.status === "OVERDUE");

  entries.forEach((entry) => {
    const daysOverdue = daysBetweenIso(entry.due_date, today);
    if (daysOverdue < 0 || daysOverdue % interval !== 0) return;

    Notification.createPending({
      user_id: user.id,
      financial_entry_id: entry.id,
      channel: "WHATSAPP",
      event_type: "OVERDUE_REMINDER",
      scheduled_at: new Date().toISOString(),
      idempotency_key: `notification:${entry.id}:overdue:${today}`,
      payload: {
        to: user.phone_e164,
        message: buildOverdueReminderMessage(entry, daysOverdue),
      },
    });
  });
}

function buildOverdueReminderMessage(entry, daysOverdue) {
  return [
    `EmDia: ${entry.description} está vencida há ${daysOverdue} dia(s).`,
    `Vencimento: ${entry.due_date}.`,
    `Valor previsto: ${formatMoney(entry.expected_amount_cents)}.`,
    `Abrir: /entries/${entry.id}`,
  ].join("\n");
}

function generateDailySummary(user, preferences) {
  if (!preferences.daily_summary_enabled) return;

  const now = new Date();
  const today = todayIso(user.timezone);
  if (!isPastPreferredTime(now, preferences.daily_summary_time, user.timezone)) return;

  const competence = currentCompetence(user.timezone);
  const entries = Entry.list(user, { competence }).filter((entry) => !FINAL_STATUSES.has(entry.status));
  const dueToday = entries.filter((entry) => entry.due_date === today).length;
  const overdue = entries.filter((entry) => entry.status === "OVERDUE").length;
  const pendingWeek = entries.filter((entry) => entry.due_date >= today && entry.due_date <= addDaysIso(today, 7)).length;

  if (!dueToday && !overdue && !pendingWeek) return;

  Notification.createPending({
    user_id: user.id,
    channel: "WHATSAPP",
    event_type: "DAILY_SUMMARY",
    scheduled_at: now.toISOString(),
    idempotency_key: `notification:${user.id}:daily-summary:${today}`,
    payload: {
      to: user.phone_e164,
      message: [
        `EmDia: resumo financeiro de ${competence}.`,
        `${dueToday} vencendo hoje.`,
        `${overdue} vencida(s).`,
        `${pendingWeek} pendente(s) nos próximos 7 dias.`,
      ].join("\n"),
    },
  });
}

async function sendPendingNotifications() {
  const client = createWhatsAppClient();
  const connectionState = await client.getConnectionState();
  const state = String(connectionState.state || "").toLowerCase();
  const isMock = connectionState.provider === "mock";
  if (!isMock && !CONNECTED_WHATSAPP_STATES.has(state)) {
    logWarn("whatsapp.notification.skipped_disconnected", "Envio WhatsApp adiado porque a instância não está conectada.", {
      details: {
        provider: connectionState.provider,
        state: connectionState.state,
      },
    });
    return;
  }

  const notifications = Notification.listPending(25);

  for (const notification of notifications) {
    const payload = parsePayload(notification.payload_json);
    const to = payload.to || notification.phone_e164;
    const message = payload.message;

    if (!to) {
      Notification.markFailed(notification.id, "Usuário sem telefone cadastrado.");
      continue;
    }

    if (!message) {
      Notification.markFailed(notification.id, "Notificação sem mensagem.");
      continue;
    }

    try {
      const result = await client.sendText({ to, message });
      Notification.markSent(notification.id, result.providerMessageId);
      logInfo("whatsapp.notification.sent", "Notificação WhatsApp enviada.", {
        user: { id: notification.user_id },
        entity: "notification",
        entityId: notification.id,
        details: {
          provider: result.provider,
          eventType: notification.event_type,
        },
      });
    } catch (error) {
      Notification.markFailed(notification.id, error.message);
      logError("whatsapp.notification.failed", "Falha ao enviar notificação WhatsApp.", {
        user: { id: notification.user_id },
        entity: "notification",
        entityId: notification.id,
        details: { message: error.message },
      });
    }
  }
}

async function getWhatsAppStatus() {
  return createWhatsAppClient().getConnectionState();
}

function buildEntryReminderMessage(entry, offset) {
  const when = offset === 0 ? "vence hoje" : `vence em ${offset} dia(s)`;
  return [
    `EmDia: ${entry.description} ${when}.`,
    `Vencimento: ${entry.due_date}.`,
    `Valor previsto: ${formatMoney(entry.expected_amount_cents)}.`,
    `Status: ${entry.status}.`,
    `Abrir: /entries/${entry.id}`,
  ].join("\n");
}

function addDaysIso(isoDate, days) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + Number(days || 0)));
  return date.toISOString().slice(0, 10);
}

function daysBetweenIso(startIso, endIso) {
  const [startYear, startMonth, startDay] = startIso.split("-").map(Number);
  const [endYear, endMonth, endDay] = endIso.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.floor((end - start) / 86400000);
}

function isPastPreferredTime(date, time, timezone) {
  const current = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return current >= time;
}

function parsePayload(payloadJson) {
  try {
    return JSON.parse(payloadJson || "{}");
  } catch (error) {
    return {};
  }
}

module.exports = {
  getWhatsAppStatus,
  runNotificationCycle,
};
