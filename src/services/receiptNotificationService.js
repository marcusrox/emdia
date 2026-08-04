const crypto = require("node:crypto");
const Notification = require("../models/Notification");
const NotificationPreference = require("../models/NotificationPreference");
const ReceiptImport = require("../models/ReceiptImport");
const User = require("../models/User");
const { formatCivilDate } = require("./dateService");
const { formatMoney } = require("./moneyService");
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
  const receipt = input.receiptId
    ? ReceiptImport.getNotificationContext(user.id, input.receiptId)
    : null;

  const notification = Notification.createPending({
    user_id: user.id,
    channel: "WHATSAPP",
    event_type: input.eventType,
    scheduled_at: new Date().toISOString(),
    idempotency_key: idempotencyKey(input, configuration.suffix),
    payload: { message: buildMessage(input, configuration.message, receipt) },
  });
  logInfo("whatsapp.receipt.notification_queued", "Notificação de comprovante garantida na fila.", {
    user: { id: user.id, email: user.email },
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

function buildMessage(input, baseMessage, receipt = null) {
  if (input.eventType === EVENT_TYPES.QUEUE_FAILED) {
    return [
      "Não foi possível receber seu comprovante pelo WhatsApp.",
      `Motivo: ${queueFailureReason(input.failureReason)}`,
      "Como resolver: envie novamente uma foto em formato JPEG ou PNG. Se o problema continuar, confira o EmDia.",
    ].join("\n");
  }

  if (input.eventType === EVENT_TYPES.PROCESSING_FAILED) {
    return [
      "Não foi possível concluir o processamento do seu comprovante.",
      receipt?.last_error_message ? `Motivo: ${singleLine(receipt.last_error_message, 240)}` : "",
      receipt?.attempt_count ? `Tentativas automáticas realizadas: ${Number(receipt.attempt_count)}.` : "",
      "Você pode conferir o comprovante e solicitar um novo processamento no EmDia.",
      secureLink("Abrir comprovante", `/receipt-imports/${encodeURIComponent(input.receiptId || "")}`),
    ].filter(Boolean).join("\n");
  }

  if (input.eventType === EVENT_TYPES.READY_FOR_REVIEW) {
    return [
      "Seu comprovante foi processado e está pronto para revisão no EmDia.",
      detailLine("Estabelecimento", receipt?.merchant_name),
      moneyLine("Valor identificado", receipt?.amount_cents),
      dateLine("Data identificada", receipt?.payment_date),
      detailLine("Categoria sugerida", receipt?.suggested_category_name),
      receipt?.duplicate_of_id ? "Atenção: este comprovante pode estar duplicado." : "",
      "Revise os dados antes de aprovar. A despesa e o pagamento ainda não foram registrados.",
      secureLink("Abrir revisão", `/receipt-imports/${encodeURIComponent(input.receiptId || "")}`),
    ].filter(Boolean).join("\n");
  }

  if (input.eventType === EVENT_TYPES.APPROVED) {
    return [
      "Seu comprovante foi aprovado e registrado no EmDia.",
      detailLine("Descrição", receipt?.entry_description),
      detailLine("Favorecido", receipt?.party_name),
      moneyLine("Valor pago", receipt?.entry_amount_cents),
      dateLine("Data do pagamento", receipt?.entry_payment_date),
      detailLine("Conta", receipt?.account_name),
      detailLine("Categoria", receipt?.category_name),
      "A despesa e o pagamento foram registrados com sucesso.",
      receipt?.financial_entry_id
        ? secureLink("Abrir lançamento", `/entries/${encodeURIComponent(receipt.financial_entry_id)}`)
        : "",
    ].filter(Boolean).join("\n");
  }

  return baseMessage;
}

function secureLink(label, pathname) {
  if (!pathname || pathname.endsWith("/")) return "";
  const baseUrl = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  return baseUrl ? `${label}: ${baseUrl}${pathname}` : "";
}

function detailLine(label, value) {
  const clean = singleLine(value, 160);
  return clean ? `${label}: ${clean}` : "";
}

function moneyLine(label, cents) {
  return Number.isSafeInteger(Number(cents)) && Number(cents) > 0
    ? `${label}: ${formatMoney(Number(cents))}`
    : "";
}

function dateLine(label, value) {
  const formatted = formatCivilDate(value, "");
  return formatted ? `${label}: ${formatted}` : "";
}

function singleLine(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function queueFailureReason(reason) {
  const reasons = {
    without_media: "a mensagem não continha uma imagem.",
    missing_media_url: "não foi possível acessar a imagem enviada.",
    unsupported_media_type: "o formato do arquivo não é aceito.",
  };
  return reasons[reason] || "o arquivo não pôde ser validado para processamento.";
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
