const { getDatabase } = require("../database/connection");
const { withImmediateTransaction } = require("../database/transaction");
const { newId } = require("../services/id");
const { toCents } = require("../services/moneyService");
const { findReceiptMatches } = require("../services/receiptMatchingService");
const AuditLog = require("./AuditLog");
const FinancialEntry = require("./FinancialEntry");
const Party = require("./Party");
const Settlement = require("./Settlement");

const STATUS = Object.freeze({
  RECEIVED: "RECEIVED",
  PROCESSING: "PROCESSING",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
});

function createFromWebhook(data) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = newId("rcp");

  try {
    db.prepare(`
      INSERT INTO receipt_imports (
        id, user_id, provider, provider_event_id, provider_message_id, webhook_request_id, provider_media_url,
        source_chat_id, sender_phone_e164, message_timestamp, status,
        original_filename, created_at, updated_at
      ) VALUES (?, ?, 'WAHA', ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?)
    `).run(
      id,
      data.user_id,
      data.provider_event_id || null,
      data.provider_message_id,
      data.webhook_request_id || null,
      data.provider_media_url,
      data.source_chat_id,
      data.sender_phone_e164,
      data.message_timestamp || null,
      sanitizeFilename(data.original_filename),
      now,
      now,
    );
    return { created: true, receipt: getById(id) };
  } catch (error) {
    if (isUniqueConstraint(error)) {
      const receipt = db.prepare(`
        SELECT * FROM receipt_imports WHERE provider = 'WAHA' AND provider_message_id = ?
      `).get(data.provider_message_id);
      return { created: false, receipt };
    }
    throw error;
  }
}

function getById(id) {
  return getDatabase().prepare("SELECT * FROM receipt_imports WHERE id = ?").get(id);
}

function getForUser(userId, id) {
  return getDatabase().prepare(`
    SELECT r.*, c.name AS category_name, a.name AS account_name,
      d.provider_message_id AS duplicate_provider_message_id,
      e.description AS linked_entry_description,
      s.total_cents AS linked_settlement_total_cents,
      s.settled_at AS linked_settlement_date
    FROM receipt_imports r
    LEFT JOIN categories c ON c.id = r.suggested_category_id
    LEFT JOIN financial_accounts a ON a.id = r.suggested_financial_account_id
    LEFT JOIN receipt_imports d ON d.id = r.duplicate_of_id
    LEFT JOIN financial_entries e ON e.id = r.financial_entry_id AND e.user_id = r.user_id
    LEFT JOIN settlements s ON s.id = r.settlement_id AND s.user_id = r.user_id
    WHERE r.user_id = ? AND r.id = ?
  `).get(userId, id);
}

function getNotificationContext(userId, id) {
  return getDatabase().prepare(`
    SELECT r.id, r.status, r.merchant_name, r.payment_date, r.amount_cents,
      r.suggested_category_name, r.duplicate_of_id, r.attempt_count,
      r.last_error_message, r.financial_entry_id, r.settlement_id,
      e.description AS entry_description,
      e.origin AS entry_origin,
      COALESCE(s.total_cents, e.realized_amount_cents) AS entry_amount_cents,
      COALESCE(s.settled_at, e.settled_at) AS entry_payment_date,
      c.name AS category_name, COALESCE(sa.name, a.name) AS account_name,
      p.name AS party_name
    FROM receipt_imports r
    LEFT JOIN financial_entries e
      ON e.id = r.financial_entry_id AND e.user_id = r.user_id
    LEFT JOIN categories c
      ON c.id = e.category_id AND c.user_id = r.user_id
    LEFT JOIN financial_accounts a
      ON a.id = e.financial_account_id AND a.user_id = r.user_id
    LEFT JOIN settlements s
      ON s.id = r.settlement_id AND s.user_id = r.user_id
    LEFT JOIN financial_accounts sa
      ON sa.id = s.financial_account_id AND sa.user_id = r.user_id
    LEFT JOIN parties p
      ON p.id = e.party_id AND p.user_id = r.user_id
    WHERE r.user_id = ? AND r.id = ?
  `).get(userId, id);
}

function listForUser(userId, filters = {}) {
  const clauses = ["r.user_id = ?"];
  const params = [userId];
  if (filters.status && Object.values(STATUS).includes(filters.status)) {
    clauses.push("r.status = ?");
    params.push(filters.status);
  }
  return getDatabase().prepare(`
    SELECT r.*, c.name AS category_name, a.name AS account_name
    FROM receipt_imports r
    LEFT JOIN categories c ON c.id = r.suggested_category_id
    LEFT JOIN financial_accounts a ON a.id = r.suggested_financial_account_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY r.created_at DESC
    LIMIT 200
  `).all(...params);
}

function claimNext({ staleMinutes = 10 } = {}) {
  const db = getDatabase();
  return withImmediateTransaction(db, () => {
    const now = new Date();
    const nowIso = now.toISOString();
    const staleIso = new Date(now.getTime() - staleMinutes * 60000).toISOString();
    const row = db.prepare(`
      SELECT * FROM receipt_imports
      WHERE (
        status = 'RECEIVED' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
      ) OR (
        status = 'PROCESSING' AND processing_started_at < ?
      )
      ORDER BY created_at
      LIMIT 1
    `).get(nowIso, staleIso);
    if (!row) return null;

    db.prepare(`
      UPDATE receipt_imports
      SET status = 'PROCESSING', processing_started_at = ?, attempt_count = attempt_count + 1,
        next_attempt_at = NULL, last_error_code = NULL, last_error_message = NULL, updated_at = ?
      WHERE id = ?
    `).run(nowIso, nowIso, row.id);
    return getById(row.id);
  });
}

function saveMedia(id, media) {
  const now = new Date().toISOString();
  getDatabase().prepare(`
    UPDATE receipt_imports
    SET storage_key = ?, media_mime_type = ?, media_size_bytes = ?, media_sha256 = ?, updated_at = ?
    WHERE id = ? AND status = 'PROCESSING'
  `).run(media.storageKey, media.mimeType, media.sizeBytes, media.sha256, now, id);
  return getById(id);
}

function findDuplicateByHash(userId, sha256, excludedId) {
  return getDatabase().prepare(`
    SELECT id, status, created_at
    FROM receipt_imports
    WHERE user_id = ? AND media_sha256 = ? AND id <> ?
      AND status <> 'REJECTED'
    ORDER BY created_at
    LIMIT 1
  `).get(userId, sha256, excludedId);
}

function markExtracted(id, extraction) {
  const now = new Date().toISOString();
  getDatabase().prepare(`
    UPDATE receipt_imports
    SET status = 'NEEDS_REVIEW', document_type = ?, merchant_name = ?, payment_date = ?,
      amount_cents = ?, currency = ?, payment_method = ?, transaction_reference = ?,
      extracted_description = ?, suggested_category_name = ?, suggested_category_id = ?,
      confidence_json = ?, warnings_json = ?, extracted_json = ?,
      extraction_response_id = ?, extraction_model = ?, duplicate_of_id = ?, processed_at = ?,
      processing_started_at = NULL, updated_at = ?
    WHERE id = ? AND status = 'PROCESSING'
  `).run(
    extraction.documentType,
    extraction.merchantName,
    extraction.paymentDate,
    extraction.amountCents,
    extraction.currency,
    extraction.paymentMethod,
    extraction.transactionReference,
    extraction.description,
    extraction.suggestedCategoryName,
    extraction.suggestedCategoryId,
    JSON.stringify(extraction.confidence || {}),
    JSON.stringify(extraction.warnings || []),
    JSON.stringify(extraction.raw || {}),
    extraction.responseId || null,
    extraction.model || null,
    extraction.duplicateOfId || null,
    now,
    now,
    id,
  );
  return getById(id);
}

function markFailure(id, error, { maxAttempts = 3 } = {}) {
  const current = getById(id);
  if (!current) return null;
  const retry = Boolean(error.retryable) && Number(current.attempt_count) < maxAttempts;
  const delaySeconds = Math.min(60, 2 ** Math.max(Number(current.attempt_count) - 1, 0) * 5);
  const now = new Date();
  const nextAttempt = retry ? new Date(now.getTime() + delaySeconds * 1000).toISOString() : null;
  getDatabase().prepare(`
    UPDATE receipt_imports
    SET status = ?, next_attempt_at = ?, processing_started_at = NULL,
      last_error_code = ?, last_error_message = ?, updated_at = ?
    WHERE id = ?
  `).run(
    retry ? STATUS.RECEIVED : STATUS.FAILED,
    nextAttempt,
    safeErrorCode(error.code),
    safeErrorMessage(error),
    now.toISOString(),
    id,
  );
  return getById(id);
}

function reject(userId, id) {
  const db = getDatabase();
  return withImmediateTransaction(db, () => {
    const receipt = db.prepare("SELECT * FROM receipt_imports WHERE user_id = ? AND id = ?").get(userId, id);
    if (!receipt) return { ok: false, reason: "not-found" };
    if (![STATUS.NEEDS_REVIEW, STATUS.FAILED].includes(receipt.status)) {
      return { ok: false, reason: "invalid-status" };
    }
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE receipt_imports SET status = 'REJECTED', rejected_at = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `).run(now, now, userId, id);
    AuditLog.record(userId, "receipt_import", id, "rejected", {});
    return { ok: true, receipt: getById(id) };
  });
}

function reprocess(userId, id) {
  const db = getDatabase();
  return withImmediateTransaction(db, () => {
    const receipt = db.prepare("SELECT * FROM receipt_imports WHERE user_id = ? AND id = ?").get(userId, id);
    if (!receipt) return { ok: false, reason: "not-found" };
    if (![STATUS.FAILED, STATUS.NEEDS_REVIEW].includes(receipt.status)) {
      return { ok: false, reason: "invalid-status" };
    }
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE receipt_imports
      SET status = 'RECEIVED', attempt_count = 0, next_attempt_at = NULL,
        processing_started_at = NULL, last_error_code = NULL, last_error_message = NULL,
        document_type = NULL, merchant_name = NULL, payment_date = NULL,
        amount_cents = NULL, currency = NULL, payment_method = NULL,
        transaction_reference = NULL, extracted_description = NULL,
        suggested_category_name = NULL, suggested_category_id = NULL,
        confidence_json = NULL, warnings_json = NULL, extracted_json = NULL,
        extraction_response_id = NULL, extraction_model = NULL, duplicate_of_id = NULL,
        processed_at = NULL, rejected_at = NULL, updated_at = ?
      WHERE user_id = ? AND id = ?
    `).run(now, userId, id);
    AuditLog.record(userId, "receipt_import", id, "reprocessed", {});
    return { ok: true, receipt: getById(id) };
  });
}

function approve(user, id, data) {
  const db = getDatabase();
  try {
    return withImmediateTransaction(db, () => {
      const receipt = db.prepare("SELECT * FROM receipt_imports WHERE user_id = ? AND id = ?").get(user.id, id);
      if (!receipt) return { ok: false, reason: "not-found" };
      if (receipt.status !== STATUS.NEEDS_REVIEW) return { ok: false, reason: "invalid-status" };

      const validation = validateApproval(db, user.id, receipt, data);
      if (!validation.ok) return validation;

      return validation.action === "EXISTING"
        ? approveExistingEntry(db, user, receipt, validation, data)
        : approveNewEntry(db, user, receipt, validation);
    });
  } catch (error) {
    if (error?.name !== "ValidationError") throw error;
    return {
      ok: false,
      reason: "validation",
      errors: receiptSettlementErrors(error.errors),
    };
  }
}

function approveNewEntry(db, user, receipt, validation) {
  const now = new Date().toISOString();
  const entryId = newId("ent");
  const party = Party.findOrCreate(user.id, validation.partyName, "PAYEE");
  db.prepare(`
      INSERT INTO financial_entries (
        id, user_id, entry_type, description, category_id, party_id,
        financial_account_id, expected_amount_cents, realized_amount_cents,
        competence_month, due_date, settled_at, status, origin, notes, created_at, updated_at
      ) VALUES (?, ?, 'EXPENSE', ?, ?, ?, ?, ?, 0, ?, ?, NULL, 'PENDING',
        'WHATSAPP_RECEIPT', ?, ?, ?)
    `).run(
    entryId,
    user.id,
    validation.description,
    validation.categoryId,
    party?.id || null,
    validation.accountId,
    validation.amountCents,
    validation.paymentDate.slice(0, 7),
    validation.paymentDate,
    `Importado do comprovante ${receipt.id}.`,
    now,
    now,
  );

  const settlement = Settlement.create(user.id, entryId, {
    financial_account_id: validation.accountId,
    settlement_type: "PAYMENT",
    principal_cents: validation.amountCents,
    total_cents: validation.amountCents,
    settled_at: validation.paymentDate,
    closes_entry: true,
    notes: "Baixa criada a partir de comprovante recebido via WhatsApp.",
  });
  db.prepare(`
      UPDATE financial_entries
      SET realized_amount_cents = ?, settled_at = ?, status = 'PAID', updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(validation.amountCents, validation.paymentDate, now, entryId, user.id);
  db.prepare(`
      UPDATE receipt_imports
      SET status = 'APPROVED', financial_entry_id = ?, settlement_id = ?, approved_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND status = 'NEEDS_REVIEW'
    `).run(entryId, settlement.id, now, now, receipt.id, user.id);

  AuditLog.record(user.id, "financial_entry", entryId, "created", {
    origin: "WHATSAPP_RECEIPT",
    receipt_import_id: receipt.id,
  });
  AuditLog.record(user.id, "receipt_import", receipt.id, "approved", {
    approval_action: "NEW",
    financial_entry_id: entryId,
    settlement_id: settlement.id,
  });
  return { ok: true, action: "NEW", entryId, settlementId: settlement.id };
}

function approveExistingEntry(db, user, receipt, validation, data) {
  const matches = findReceiptMatches({
    merchant_name: validation.partyName || receipt.merchant_name,
    payment_date: validation.paymentDate,
    amount_cents: validation.amountCents,
  }, FinancialEntry.listOpenExpenses(user));
  const selectionSource = matches.some((entry) => entry.id === validation.entryId) ? "SUGGESTED" : "MANUAL";
  const result = FinancialEntry.settleWithinTransaction(user, validation.entryId, {
    financial_account_id: validation.accountId,
    principal: data.amount,
    interest: "0,00",
    penalty: "0,00",
    discount: "0,00",
    other_adjustment: "0,00",
    settled_at: validation.paymentDate,
    settlement_completion: validation.settlementCompletion,
    confirm_excess: data.confirm_excess,
    notes: `Baixa criada a partir do comprovante ${receipt.id} recebido via WhatsApp.`,
  });
  if (!result) {
    return { ok: false, reason: "validation", errors: { financial_entry_id: "Selecione uma despesa em aberto válida." } };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE receipt_imports
    SET status = 'APPROVED', financial_entry_id = ?, settlement_id = ?, approved_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'NEEDS_REVIEW'
  `).run(result.entry.id, result.settlement.id, now, now, receipt.id, user.id);
  AuditLog.record(user.id, "receipt_import", receipt.id, "approved", {
    approval_action: "EXISTING",
    selection_source: selectionSource,
    financial_entry_id: result.entry.id,
    settlement_id: result.settlement.id,
  });
  return {
    ok: true,
    action: "EXISTING",
    entryId: result.entry.id,
    settlementId: result.settlement.id,
  };
}

function validateApproval(db, userId, receipt, data) {
  const errors = {};
  const action = String(data.approval_action || "NEW").trim().toUpperCase();
  const description = String(data.description || "").trim();
  const partyName = String(data.party_name || "").trim();
  const paymentDate = String(data.payment_date || "").trim();
  let amountCents = 0;
  try { amountCents = toCents(data.amount); } catch (error) { errors.amount = error.message; }
  if (!["NEW", "EXISTING"].includes(action)) errors.approval_action = "Selecione como deseja registrar o comprovante.";
  if (action === "NEW" && !description) errors.description = "Informe a descrição da despesa.";
  if (action === "NEW" && description.length > 200) errors.description = "Use no máximo 200 caracteres na descrição.";
  if (!isIsoDate(paymentDate)) errors.payment_date = "Informe uma data de pagamento válida.";
  if (!amountCents || amountCents < 1) errors.amount = "Informe um valor maior que zero.";

  const categoryId = String(data.category_id || "").trim() || null;
  if (action === "NEW" && categoryId) {
    const category = db.prepare(`
      SELECT id FROM categories
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND is_active = 1
        AND entry_type IN ('EXPENSE', 'BOTH')
    `).get(categoryId, userId);
    if (!category) errors.category_id = "Selecione uma categoria de despesa válida.";
  }
  const accountId = String(data.financial_account_id || "").trim();
  const account = db.prepare(`
    SELECT id FROM financial_accounts
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND is_active = 1
  `).get(accountId, userId);
  if (!account) errors.financial_account_id = "Selecione a conta usada no pagamento.";
  const entryId = String(data.financial_entry_id || "").trim();
  const settlementCompletion = String(data.settlement_completion || "PARTIAL").trim().toUpperCase();
  if (action === "EXISTING") {
    const entry = db.prepare(`
      SELECT id FROM financial_entries
      WHERE id = ? AND user_id = ? AND entry_type = 'EXPENSE' AND deleted_at IS NULL
    `).get(entryId, userId);
    if (!entry) errors.financial_entry_id = "Selecione uma despesa em aberto válida.";
    if (!["PARTIAL", "FINAL"].includes(settlementCompletion)) {
      errors.settlement_completion = "Selecione como uma eventual diferença deve ser tratada.";
    }
  }
  if (receipt.duplicate_of_id && String(data.confirm_duplicate || "") !== "1") {
    errors.confirm_duplicate = "Confirme que deseja aprovar este possível comprovante duplicado.";
  }

  return Object.keys(errors).length
    ? { ok: false, reason: "validation", errors }
    : {
        ok: true,
        action,
        description,
        partyName,
        paymentDate,
        amountCents,
        categoryId,
        accountId,
        entryId,
        settlementCompletion,
      };
}

function receiptSettlementErrors(errors = {}) {
  return {
    ...errors,
    amount: errors.amount || errors.principal,
    payment_date: errors.payment_date || errors.settled_at,
    financial_entry_id: errors.financial_entry_id || errors.settlement,
  };
}

function listExpiredMedia(cutoffIso) {
  return getDatabase().prepare(`
    SELECT id, storage_key
    FROM receipt_imports
    WHERE storage_key IS NOT NULL AND status IN ('APPROVED', 'REJECTED')
      AND COALESCE(approved_at, rejected_at, updated_at) < ?
    LIMIT 100
  `).all(cutoffIso);
}

function clearMedia(id) {
  getDatabase().prepare(`
    UPDATE receipt_imports SET storage_key = NULL, updated_at = ? WHERE id = ?
  `).run(new Date().toISOString(), id);
}

function sanitizeFilename(value) {
  const filename = String(value || "comprovante").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return filename.slice(0, 160) || "comprovante";
}

function isUniqueConstraint(error) {
  return String(error?.code || "").includes("SQLITE_CONSTRAINT_UNIQUE")
    || String(error?.message || "").includes("UNIQUE constraint failed");
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeErrorCode(value) {
  return String(value || "RECEIPT_PROCESSING_FAILED").replace(/[^A-Z0-9_-]/gi, "_").slice(0, 80);
}

function safeErrorMessage(error) {
  const known = {
    OPENROUTER_NOT_CONFIGURED: "A integração com OpenRouter ainda não foi configurada.",
    MEDIA_TOO_LARGE: "A imagem excede o limite permitido.",
    UNSUPPORTED_MEDIA: "O arquivo recebido não é uma imagem JPEG ou PNG válida.",
  };
  return known[error?.code] || "Não foi possível processar o comprovante. Tente reprocessar mais tarde.";
}

module.exports = {
  STATUS,
  approve,
  claimNext,
  clearMedia,
  createFromWebhook,
  findDuplicateByHash,
  getById,
  getForUser,
  getNotificationContext,
  listExpiredMedia,
  listForUser,
  markExtracted,
  markFailure,
  reject,
  reprocess,
  saveMedia,
};
