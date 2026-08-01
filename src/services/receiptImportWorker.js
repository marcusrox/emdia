const ReceiptImport = require("../models/ReceiptImport");
const { extractReceipt } = require("./receiptExtractionService");
const { deleteStoredReceipt, downloadReceiptMedia } = require("./receiptStorageService");
const { logInfo, logWarn } = require("./operationalLogger");

let scheduler = null;
let running = false;
let lastCleanupAt = 0;

function startReceiptImportWorker() {
  if (scheduler || process.env.RECEIPT_WORKER_DISABLED === "1") return;
  const intervalMs = Math.max(positiveNumber(process.env.RECEIPT_WORKER_INTERVAL_MS, 2000), 500);
  scheduler = setInterval(runSafely, intervalMs);
  scheduler.unref?.();
  logInfo("whatsapp.receipt.worker_started", "Worker de comprovantes iniciado.", {
    details: { intervalMs },
  });
  runSafely();
}

function wakeReceiptImportWorker() {
  if (process.env.RECEIPT_WORKER_DISABLED === "1") return;
  setImmediate(runSafely);
}

async function runSafely() {
  if (running) return;
  running = true;
  try {
    let receipt;
    while ((receipt = ReceiptImport.claimNext())) {
      await processReceipt(receipt);
    }
    cleanupExpiredMedia();
  } catch (error) {
    logWarn("whatsapp.receipt.worker_failed", "Ciclo do worker de comprovantes falhou.", {
      details: { code: safeCode(error.code || "WORKER_FAILURE") },
    });
  } finally {
    running = false;
  }
}

async function processReceipt(receipt, options = {}) {
  try {
    let current = receipt;
    if (!current.storage_key) {
      const media = await (options.downloadReceiptMedia || downloadReceiptMedia)(current);
      current = ReceiptImport.saveMedia(current.id, media);
      logInfo("whatsapp.receipt.media_downloaded", "Mídia do comprovante armazenada.", {
        entity: "receipt_import",
        entityId: current.id,
        details: { mime: media.mimeType, sizeBytes: media.sizeBytes, attempt: current.attempt_count },
      });
    }

    const duplicate = ReceiptImport.findDuplicateByHash(current.user_id, current.media_sha256, current.id);
    const extraction = await (options.extractReceipt || extractReceipt)(current);
    ReceiptImport.markExtracted(current.id, {
      ...extraction,
      duplicateOfId: duplicate?.id || null,
    });
    logInfo("whatsapp.receipt.extraction_completed", "Extração do comprovante concluída para revisão.", {
      entity: "receipt_import",
      entityId: current.id,
      details: {
        model: extraction.model,
        durationMs: extraction.durationMs,
        usage: extraction.usage,
        attempt: current.attempt_count,
        possibleDuplicate: Boolean(duplicate),
      },
    });
  } catch (error) {
    const failed = ReceiptImport.markFailure(receipt.id, error, {
      maxAttempts: positiveNumber(process.env.RECEIPT_WORKER_MAX_ATTEMPTS, 3),
    });
    const event = String(error.code || "").startsWith("MEDIA_")
      ? "whatsapp.receipt.media_failed"
      : "whatsapp.receipt.extraction_failed";
    logWarn(event, "Processamento do comprovante falhou.", {
      entity: "receipt_import",
      entityId: receipt.id,
      details: {
        code: safeCode(error.code || "PROCESSING_FAILURE"),
        attempt: failed?.attempt_count,
        willRetry: failed?.status === ReceiptImport.STATUS.RECEIVED,
      },
    });
  }
}

function cleanupExpiredMedia() {
  const now = Date.now();
  if (now - lastCleanupAt < 3600000) return;
  lastCleanupAt = now;
  const retentionDays = positiveNumber(process.env.RECEIPT_RETENTION_DAYS, 90);
  const cutoff = new Date(now - retentionDays * 86400000).toISOString();
  for (const receipt of ReceiptImport.listExpiredMedia(cutoff)) {
    try {
      deleteStoredReceipt(receipt.storage_key);
      ReceiptImport.clearMedia(receipt.id);
    } catch (error) {
      logWarn("whatsapp.receipt.retention_failed", "Falha ao remover mídia expirada de comprovante.", {
        entity: "receipt_import",
        entityId: receipt.id,
        details: { code: safeCode(error.code || "RETENTION_FAILURE") },
      });
    }
  }
}

function safeCode(value) { return String(value || "").replace(/[^A-Z0-9_-]/gi, "_").slice(0, 80); }
function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

module.exports = {
  processReceipt,
  runSafely,
  startReceiptImportWorker,
  wakeReceiptImportWorker,
};
