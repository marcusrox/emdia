const Notification = require("../models/Notification");
const { DEFAULT_EMAIL_FROM, createEmailClient } = require("./emailClient");
const { accountCreatedEmail } = require("./emailTemplateService");
const { logError, logInfo, logWarn } = require("./operationalLogger");

const BACKOFF_MS = [60000, 300000, 900000, 3600000];

function enqueueAccountCreatedEmail(user) {
  return Notification.createPending({
    user_id: user.id,
    channel: "EMAIL",
    event_type: "ACCOUNT_CREATED",
    scheduled_at: new Date().toISOString(),
    idempotency_key: `email:${user.id}:account-created`,
    payload: { name: user.name, to: user.email, template_version: 1 },
  });
}

async function runEmailNotificationCycle(options = {}) {
  const maxAttempts = positiveInteger(options.maxAttempts || process.env.EMAIL_NOTIFICATION_MAX_ATTEMPTS, 5);
  const client = options.client || createEmailClient(options.clientOptions);
  const now = options.now instanceof Date ? options.now : new Date();
  const entries = Notification.listPendingEmail(options.limit || 25, maxAttempts, now.toISOString());

  for (const notification of entries) {
    await processNotification(notification, { client, maxAttempts, now, from: options.from });
  }
  return entries.length;
}

async function processNotification(notification, options) {
  const payload = parsePayload(notification.payload_json);
  const to = String(payload.to || notification.user_email || "").trim();
  const name = payload.name || notification.user_name;
  const template = accountCreatedEmail({ name });
  const attempt = notification.attempt_count + 1;

  try {
    const result = await options.client.send({
      to,
      from: options.from || process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: notification.idempotency_key,
    });
    Notification.markSent(notification.id, result.providerMessageId);
    logInfo("email.notification.sent", "Notificação por e-mail aceita pelo provedor.", {
      user: { id: notification.user_id, email: notification.user_email }, entity: "notification", entityId: notification.id,
      details: { provider: options.client.provider, eventType: notification.event_type, attempt },
    });
  } catch (error) {
    const canRetry = Boolean(error?.transient) && attempt < options.maxAttempts;
    const scheduledAt = canRetry
      ? new Date(options.now.getTime() + BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]).toISOString()
      : null;
    Notification.markFailed(notification.id, failureMessage(error), {
      scheduledAt,
      attemptCount: canRetry ? attempt : options.maxAttempts,
    });
    const context = {
      user: { id: notification.user_id, email: notification.user_email }, entity: "notification", entityId: notification.id,
      details: {
        provider: options.client.provider,
        eventType: notification.event_type,
        attempt,
        errorCode: String(error?.code || "unexpected_error"),
        statusCode: error?.statusCode || null,
        retryScheduled: canRetry,
      },
    };
    if (String(error?.code || "").includes("api_key") || String(error?.code || "").includes("provider")) {
      logWarn("email.notification.skipped_configuration", "Envio de e-mail não executado por configuração inválida.", context);
    } else {
      logError("email.notification.failed", "Falha controlada ao enviar notificação por e-mail.", context);
    }
  }
}

function failureMessage(error) {
  const code = String(error?.code || "unexpected_error").replace(/[^a-z0-9_-]/gi, "_").slice(0, 80);
  return `Falha no envio de e-mail (${code}).`;
}

function parsePayload(value) {
  try { return JSON.parse(value || "{}"); } catch (error) { return {}; }
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = { BACKOFF_MS, enqueueAccountCreatedEmail, runEmailNotificationCycle };
