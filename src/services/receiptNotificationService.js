const crypto = require("node:crypto");
const Notification = require("../models/Notification");
const NotificationPreference = require("../models/NotificationPreference");
const User = require("../models/User");
const { normalizeAppBaseUrl } = require("./notificationService");
const { logInfo, logWarn } = require("./operationalLogger");

const EVENT_TYPES = Object.freeze({
  QUEUE_FAILED: "RECEIPT_QUEUE_FAILED",
  PROCESSING_FAILED: "RECEIPT_PROCESSING_FAILED",
  READY_FOR_REVIEW: "RECEIPT_READY_FOR_REVIEW",
  APPROVED: "RECEIPT_APPROVED",
});

const EVENT_CONFIGURATION = Object.freeze({
  [EVENT_TYPES.QUEUE_FAILED]: {
    preference: "receipt_queue_failure_enabled",
    suffix: "queue-failed",
    message: "Não foi possível receber seu comprovante. Tente enviá-lo novamente ou confira o EmDia.",
  },
  [EVENT_TYPES.PROCESSING_FAILED]: {
    preference: "receipt_processing_failure_enabled",
    suffix: "processing-failed",
    message: "Não foi possível processar seu comprovante. Abra o EmDia para conferir e tentar novamente.",
  },
  [EVENT_TYPES.READY_FOR_REVIEW]: {
    preference: "receipt_ready_review_enabled",
    suffix: "ready-for-review",
    message: "Seu comprovante foi processado e está pronto para revisão no EmDia.",
  },
  [EVENT_TYPES.APPROVED]: {
    preference: "receipt_approved_enabled",
    suffix: "approved",
    message: "Seu comprovante foi aprovado e registrado no EmDia.",
  },
});

function enqueueReceiptNotification(input) {
  const configuration = EVENT_CONFIGURATION[input.eventType];
  if (!configuration) throw new Error("RECEIPT_NOTIFICATION_EVENT_INVALID");

  const user = User.getById(input.userId);
  if (!user?.phone_e164) return null;
  const preferences = NotificationPreference.getOrCreate(user.id);
  if (!preferences.whatsapp_enabled || !preferences[configuration.preference]) return null;

  const notification = Notification.createPending({
    user_id: user.id,
    channel: "WHATSAPP",
    event_type: input.eventType,
    scheduled_at: new Date().toISOString(),
    idempotency_key: idempotencyKey(input, configuration.suffix),
    payload: { message: buildMessage(input, configuration.message) },
  });
  logInfo("whatsapp.receipt.notification_queued", "Notificação de comprovante garantida na fila.", {
    user: { id: user.id },
    entity: "notification",
    entityId: notification?.id,
    details: { eventType: input.eventType },
  });
  return notification;
}

function enqueueReceiptNotificationSafely(input) {
  try {
    return enqueueReceiptNotification(input);
  } catch (error) {
    logWarn("whatsapp.receipt.notification_queue_failed", "Falha ao enfileirar notificação de comprovante.", {
      user: input.userId ? { id: input.userId } : null,
      entity: input.receiptId ? "receipt_import" : null,
      entityId: input.receiptId || null,
      details: {
        eventType: input.eventType,
        code: safeCode(error.code || error.message || "NOTIFICATION_QUEUE_FAILURE"),
      },
    });
    return null;
  }
}

function buildMessage(input, baseMessage) {
  if (input.eventType !== EVENT_TYPES.READY_FOR_REVIEW || !input.receiptId) return baseMessage;
  const baseUrl = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  return baseUrl
    ? `${baseMessage}\nAbrir: ${baseUrl}/receipt-imports/${encodeURIComponent(input.receiptId)}`
    : baseMessage;
}

function idempotencyKey(input, suffix) {
  if (input.receiptId) return `receipt:${input.receiptId}:${suffix}`;
  const provider = String(input.provider || "WAHA").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "waha";
  const messageReference = crypto
    .createHash("sha256")
    .update(`${provider}:${String(input.providerMessageId || "")}`)
    .digest("hex")
    .slice(0, 32);
  return `receipt:${provider}:${messageReference}:${suffix}`;
}

function safeCode(value) {
  return String(value || "").replace(/[^A-Z0-9_-]/gi, "_").slice(0, 80);
}

module.exports = {
  EVENT_TYPES,
  buildMessage,
  enqueueReceiptNotification,
  enqueueReceiptNotificationSafely,
  idempotencyKey,
};
