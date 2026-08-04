const express = require("express");
const { logError, logInfo, logWarn } = require("../services/operationalLogger");
const { acceptWebhook } = require("../services/wahaReceiptWebhookService");
const { wakeReceiptImportWorker } = require("../services/receiptImportWorker");

function registerWhatsAppWebhookRoutes(app, options = {}) {
  const accept = options.acceptWebhook || acceptWebhook;
  app.post(
    "/webhooks/whatsapp/waha",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req, res) => {
      const requestId = safeId(req.get("X-Webhook-Request-Id"));
      const receiptDetails = incomingRequestDetails(req);
      logInfo("whatsapp.webhook.received", "Webhook do WAHA recebido.", {
        requestId,
        details: receiptDetails,
      });
      if (!Buffer.isBuffer(req.body)) {
        logWarn("whatsapp.webhook.invalid_payload", "Webhook WAHA sem corpo JSON bruto válido.", {
          requestId,
          details: { ...receiptDetails, outcome: "rejected", reason: "raw_json_body_missing" },
        });
        return res.status(400).json({ ok: false });
      }
      try {
        const result = await accept(req.body, req.headers);
        if (!result.ok) {
          const eventName = result.reason === "replay_rejected"
            ? "whatsapp.webhook.replay_rejected"
            : result.reason?.includes("signature") || result.reason === "hmac_not_configured"
              ? "whatsapp.webhook.invalid_signature"
              : "whatsapp.webhook.invalid_payload";
          logWarn(eventName, "Webhook WAHA recusado.", {
            requestId,
            details: {
              ...receiptDetails,
              ...result.logDetails,
              outcome: "rejected",
              reason: result.reason,
              httpStatus: result.status || 400,
            },
          });
          return res.status(result.status || 400).json({ ok: false });
        }
        if (result.ignored) {
          logInfo("whatsapp.webhook.ignored", "Webhook WAHA ignorado.", {
            requestId,
            allowWebhookSenderE164: result.reason === "user_not_found",
            user: result.userId ? { id: result.userId } : null,
            details: {
              ...result.logDetails,
              outcome: "ignored",
              reason: result.reason,
              event: result.eventName,
            },
          });
          return res.status(200).json({ ok: true });
        }
        if (result.duplicate) {
          logInfo("whatsapp.webhook.duplicate", "Webhook WAHA duplicado ignorado.", {
            requestId,
            entity: "receipt_import",
            entityId: result.receiptId,
            user: result.userId ? { id: result.userId } : null,
            details: { ...result.logDetails, outcome: "duplicate" },
          });
          return res.status(200).json({ ok: true });
        }
        logInfo("whatsapp.receipt.queued", "Comprovante enfileirado para processamento.", {
          requestId,
          entity: "receipt_import",
          entityId: result.receiptId,
          user: result.userId ? { id: result.userId } : null,
          details: { ...result.logDetails, outcome: "queued" },
        });
        wakeReceiptImportWorker();
        return res.status(200).json({ ok: true });
      } catch (error) {
        logError("whatsapp.webhook.failed", "Falha transitória ao persistir webhook WAHA.", {
          requestId,
          details: {
            ...receiptDetails,
            ...error.webhookLogDetails,
            stage: error.webhookLogDetails?.stage || "processing",
            outcome: "failed",
            code: safeId(error.code || "WEBHOOK_FAILURE"),
          },
        });
        return res.status(500).json({ ok: false });
      }
    },
    (error, req, res, next) => {
      if (error?.type === "entity.too.large") return res.status(413).json({ ok: false });
      if (error instanceof SyntaxError) return res.status(400).json({ ok: false });
      return next(error);
    },
  );
}

function safeId(value) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160); }

function incomingRequestDetails(req) {
  const contentLength = Number(req.get("Content-Length") || 0);
  return {
    stage: "received",
    contentType: safeId(req.get("Content-Type")).slice(0, 100),
    contentLength: Number.isSafeInteger(contentLength) && contentLength >= 0 ? contentLength : 0,
    requestIdPresent: Boolean(req.get("X-Webhook-Request-Id")),
    signaturePresent: Boolean(req.get("X-Webhook-Hmac")),
    timestampPresent: Boolean(req.get("X-Webhook-Timestamp")),
    hmacAlgorithm: safeId(req.get("X-Webhook-Hmac-Algorithm")).slice(0, 20).toLowerCase(),
  };
}

module.exports = { incomingRequestDetails, registerWhatsAppWebhookRoutes };
