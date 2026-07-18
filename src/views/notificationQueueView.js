const { layout } = require("./layout");
const { buttonContent, csrfInput, escapeHtml, lucideIcon, option, pageHeading } = require("../services/viewHelpers");

const STATUS_OPTIONS = [
  ["PENDING", "Pendente"],
  ["FAILED", "Falhou"],
  ["SENT", "Enviada"],
  ["CANCELLED", "Cancelada"],
];
const EVENT_OPTIONS = [
  ["DUE_REMINDER", "A vencer"],
  ["DUE_TODAY", "Vence hoje"],
  ["OVERDUE_REMINDER", "Vencida"],
  ["DAILY_SUMMARY", "Resumo diário"],
];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS);
const EVENT_LABELS = Object.fromEntries(EVENT_OPTIONS);

function notificationQueueView({ user, entries, users, filters, notifications = [] }) {
  return layout({
    title: "Fila de notificações",
    user,
    active: "/admin/notifications",
    notifications,
    body: `
      ${pageHeading({
        eyebrow: "Administração · WhatsApp outbound",
        title: "Fila de notificações",
        description: "Consulte eventos gerados, acompanhe tentativas e controle o reenvio sem perder o histórico.",
        className: "notification-queue-heading",
        actions: `<span class="queue-admin-chip">${lucideIcon("shield-check")} Acesso administrativo</span>`,
      })}
      ${queueSummary(entries)}
      <section class="toolbar queue-toolbar">
        <form method="get" action="/admin/notifications" class="filters queue-filters">
          <label>Usuário
            <select name="user_id">
              ${option("", "Todos os usuários", filters.user_id)}
              ${users.map((item) => option(item.id, `${item.name} · ${item.email}${item.is_active ? "" : " · inativo"}`, filters.user_id)).join("")}
            </select>
          </label>
          <label>Status
            <select name="status">${option("", "Todos", filters.status)}${STATUS_OPTIONS.map(([value, label]) => option(value, label, filters.status)).join("")}</select>
          </label>
          <label>Tipo
            <select name="event_type">${option("", "Todos", filters.event_type)}${EVENT_OPTIONS.map(([value, label]) => option(value, label, filters.event_type)).join("")}</select>
          </label>
          <label>Busca
            <input name="q" value="${escapeHtml(filters.q || "")}" placeholder="ID, mensagem ou erro">
          </label>
          <label>Limite
            <input name="limit" value="${escapeHtml(filters.limit || 100)}" inputmode="numeric">
          </label>
          <div class="toolbar-actions">
            <button type="submit">${buttonContent("Filtrar", "filter")}</button>
            <a class="ghost-button" href="/admin/notifications">${buttonContent("Limpar", "eraser")}</a>
          </div>
        </form>
      </section>
      ${queueTable(user, entries)}
    `,
  });
}

function queueSummary(entries) {
  const count = (status) => entries.filter((entry) => entry.status === status).length;
  return `<section class="queue-summary" aria-label="Resumo da fila">
    ${summaryCard("Exibidas", entries.length, "list-filter", "total")}
    ${summaryCard("Pendentes", count("PENDING"), "clock-3", "pending")}
    ${summaryCard("Com falha", count("FAILED"), "triangle-alert", "failed")}
    ${summaryCard("Enviadas", count("SENT"), "circle-check-big", "sent")}
  </section>`;
}

function summaryCard(label, value, icon, tone) {
  return `<article class="queue-summary-card queue-summary-${tone}">
    <span class="queue-summary-icon">${lucideIcon(icon)}</span>
    <span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>
  </article>`;
}

function queueTable(user, entries) {
  if (!entries.length) return `<div class="empty-state">Nenhum item da fila corresponde aos filtros.</div>`;

  return `<div class="table-wrap queue-table-wrap"><table class="notification-queue-table">
    <thead><tr><th>Notificação</th><th>Usuário</th><th>Status</th><th>Agendamento</th><th>Tentativas</th><th>Mensagem / erro</th><th class="record-actions-cell">Ações</th></tr></thead>
    <tbody>${entries.map((entry) => queueRow(user, entry)).join("")}</tbody>
  </table></div>`;
}

function queueRow(user, entry) {
  const payload = parsePayload(entry.payload_json);
  const cancellable = entry.status === "PENDING" || entry.status === "FAILED";
  return `<tr>
    <td><strong class="queue-event">${escapeHtml(EVENT_LABELS[entry.event_type] || entry.event_type)}</strong><small class="queue-id">${escapeHtml(entry.id)}</small></td>
    <td><strong>${escapeHtml(entry.user_name)}</strong><small class="queue-user-email">${escapeHtml(entry.user_email)}</small></td>
    <td><span class="queue-status queue-status-${escapeHtml(entry.status.toLowerCase())}">${escapeHtml(STATUS_LABELS[entry.status] || entry.status)}</span></td>
    <td><span class="queue-date">${escapeHtml(formatDateTime(entry.scheduled_at))}</span><small>Criada ${escapeHtml(formatDateTime(entry.created_at))}</small></td>
    <td><strong class="queue-attempts">${escapeHtml(entry.attempt_count)} / 5</strong></td>
    <td class="queue-message"><span>${escapeHtml(payload.message || "Sem mensagem")}</span>${entry.error_message ? `<small class="queue-error">${lucideIcon("circle-alert")} ${escapeHtml(entry.error_message)}</small>` : ""}</td>
    <td class="record-actions-cell"><div class="record-actions">
      <form method="post" action="/admin/notifications/${encodeURIComponent(entry.id)}/resend" class="record-action-form">
        ${csrfInput(user)}<button class="record-action-button" type="submit" title="Reenviar notificação" aria-label="Reenviar notificação">${lucideIcon("refresh-cw")}</button>
      </form>
      ${cancellable ? `<form method="post" action="/admin/notifications/${encodeURIComponent(entry.id)}/cancel" class="record-action-form" data-confirm="Cancelar esta notificação pendente?">
        ${csrfInput(user)}<button class="record-action-button danger" type="submit" title="Cancelar notificação" aria-label="Cancelar notificação">${lucideIcon("ban")}</button>
      </form>` : ""}
    </div></td>
  </tr>`;
}

function parsePayload(value) {
  try { return JSON.parse(value || "{}"); } catch (error) { return {}; }
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
  } catch (error) { return value; }
}

module.exports = { notificationQueueView };
