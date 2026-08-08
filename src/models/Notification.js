const { getDatabase } = require("../database/connection");
const { withImmediateTransaction } = require("../database/transaction");
const { newId } = require("../services/id");

const DEFAULT_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

function createPending(input) {
  const now = new Date().toISOString();
  const id = newId("ntf");

  try {
    getDatabase()
      .prepare(
        `
        INSERT INTO notifications (
          id, user_id, financial_entry_id, channel, event_type,
          scheduled_at, status, idempotency_key, payload_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
      `
      )
      .run(
        id,
        input.user_id,
        input.financial_entry_id || null,
        input.channel,
        input.event_type,
        input.scheduled_at,
        input.idempotency_key,
        JSON.stringify(input.payload || {}),
        now,
        now
      );

    return getById(id);
  } catch (error) {
    if (String(error.message || "").includes("UNIQUE")) {
      return getByIdempotencyKey(input.idempotency_key);
    }

    throw error;
  }
}

function getById(id) {
  return getDatabase().prepare("SELECT * FROM notifications WHERE id = ? LIMIT 1").get(id);
}

function getByIdempotencyKey(idempotencyKey) {
  return getDatabase()
    .prepare("SELECT * FROM notifications WHERE idempotency_key = ? LIMIT 1")
    .get(idempotencyKey);
}

function listPending(limit = 25) {
  return getDatabase()
    .prepare(
      `
      SELECT notifications.*, users.phone_e164, users.email AS user_email,
        users.name AS user_name, users.timezone
      FROM notifications
      JOIN users ON users.id = notifications.user_id
      WHERE notifications.channel = 'WHATSAPP'
        AND notifications.status IN ('PENDING', 'FAILED')
        AND notifications.scheduled_at <= ?
        AND notifications.attempt_count < 5
        AND users.is_active = 1
      ORDER BY notifications.scheduled_at ASC, notifications.created_at ASC
      LIMIT ?
    `
    )
    .all(new Date().toISOString(), limit);
}

function listPendingEmail(limit = 25, maxAttempts = 5, now = new Date().toISOString()) {
  return getDatabase()
    .prepare(
      `
      SELECT notifications.*, users.email AS user_email, users.name AS user_name,
        users.locale, users.timezone, users.is_active
      FROM notifications
      JOIN users ON users.id = notifications.user_id
      WHERE notifications.channel = 'EMAIL'
        AND notifications.status IN ('PENDING', 'FAILED')
        AND notifications.scheduled_at <= ?
        AND notifications.attempt_count < ?
      ORDER BY notifications.scheduled_at ASC, notifications.created_at ASC
      LIMIT ?
    `
    )
    .all(now, maxAttempts, limit);
}

function claimPending(channel, options = {}) {
  const db = options.db || getDatabase();
  const normalizedChannel = String(channel || "").trim().toUpperCase();
  const limit = Math.min(Math.max(Number.parseInt(options.limit, 10) || 25, 1), 100);
  const maxAttempts = Math.min(Math.max(Number.parseInt(options.maxAttempts, 10) || 5, 1), 100);
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const claimTimeoutMs = positiveInteger(options.claimTimeoutMs, DEFAULT_CLAIM_TIMEOUT_MS);
  const nowIso = now.toISOString();
  const staleBeforeIso = new Date(now.getTime() - claimTimeoutMs).toISOString();
  const claimToken = options.claimToken || newId("clm");

  return withImmediateTransaction(db, () => {
    db.prepare(`
      UPDATE notifications
      SET status = 'FAILED', claim_token = NULL, claimed_at = NULL,
        error_message = COALESCE(error_message, 'Processamento interrompido após o limite de tentativas.'),
        updated_at = ?
      WHERE channel = ? AND status = 'PROCESSING' AND claimed_at <= ?
        AND attempt_count >= ?
    `).run(nowIso, normalizedChannel, staleBeforeIso, maxAttempts);

    const candidates = db.prepare(`
      SELECT notifications.id
      FROM notifications
      JOIN users ON users.id = notifications.user_id
      WHERE notifications.channel = ?
        AND notifications.attempt_count < ?
        AND (? <> 'WHATSAPP' OR users.is_active = 1)
        AND (
          (notifications.status IN ('PENDING', 'FAILED') AND notifications.scheduled_at <= ?)
          OR
          (notifications.status = 'PROCESSING' AND notifications.claimed_at <= ?)
        )
      ORDER BY notifications.scheduled_at ASC, notifications.created_at ASC
      LIMIT ?
    `).all(normalizedChannel, maxAttempts, normalizedChannel, nowIso, staleBeforeIso, limit);

    const claim = db.prepare(`
      UPDATE notifications
      SET status = 'PROCESSING', claim_token = ?, claimed_at = ?,
        attempt_count = attempt_count + 1, updated_at = ?
      WHERE id = ?
    `);
    candidates.forEach((candidate) => claim.run(claimToken, nowIso, nowIso, candidate.id));
    if (!candidates.length) return [];

    return db.prepare(`
      SELECT notifications.*, users.phone_e164, users.email AS user_email,
        users.name AS user_name, users.locale, users.timezone, users.is_active
      FROM notifications
      JOIN users ON users.id = notifications.user_id
      WHERE notifications.claim_token = ?
      ORDER BY notifications.scheduled_at ASC, notifications.created_at ASC
    `).all(claimToken);
  });
}

function listForAdmin(filters = {}) {
  const clauses = ["1 = 1"];
  const params = [];

  if (filters.user_id) {
    clauses.push("notifications.user_id = ?");
    params.push(filters.user_id);
  }
  if (filters.status) {
    clauses.push("notifications.status = ?");
    params.push(filters.status);
  }
  if (filters.channel) {
    clauses.push("notifications.channel = ?");
    params.push(filters.channel);
  }
  if (filters.event_type) {
    clauses.push("notifications.event_type = ?");
    params.push(filters.event_type);
  }
  if (filters.q) {
    clauses.push("(notifications.id LIKE ? OR notifications.error_message LIKE ? OR notifications.payload_json LIKE ?)");
    const term = `%${filters.q}%`;
    params.push(term, term, term);
  }

  const limit = Math.min(Math.max(Number.parseInt(filters.limit, 10) || 100, 1), 500);
  params.push(limit);
  return getDatabase().prepare(`
    SELECT notifications.*, users.name AS user_name, users.email AS user_email
    FROM notifications
    JOIN users ON users.id = notifications.user_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY notifications.created_at DESC
    LIMIT ?
  `).all(...params);
}

function resend(id) {
  const source = getById(id);
  if (!source) return null;

  return createPending({
    user_id: source.user_id,
    financial_entry_id: source.financial_entry_id,
    channel: source.channel,
    event_type: source.event_type,
    scheduled_at: new Date().toISOString(),
    idempotency_key: `${source.idempotency_key}:admin-resend:${newId("retry")}`,
    payload: parsePayload(source.payload_json),
  });
}

function cancel(id) {
  const result = getDatabase().prepare(`
    UPDATE notifications
    SET status = 'CANCELLED', error_message = NULL, updated_at = ?
    WHERE id = ? AND status IN ('PENDING', 'FAILED')
  `).run(new Date().toISOString(), id);
  return result.changes ? getById(id) : null;
}

function parsePayload(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (error) {
    return {};
  }
}

function markSent(id, providerMessageId, claimToken, options = {}) {
  const result = (options.db || getDatabase())
    .prepare(
      `
      UPDATE notifications
      SET status = 'SENT', sent_at = ?, provider_message_id = ?,
        error_message = NULL, claim_token = NULL, claimed_at = NULL, updated_at = ?
      WHERE id = ? AND status = 'PROCESSING' AND claim_token = ?
    `
    )
    .run(new Date().toISOString(), providerMessageId || null, new Date().toISOString(), id, claimToken);
  return result.changes === 1;
}

function markFailed(id, errorMessage, options = {}) {
  const attemptCount = Number.isInteger(options.attemptCount) ? options.attemptCount : null;
  const result = (options.db || getDatabase())
    .prepare(
      `
      UPDATE notifications SET status = 'FAILED',
        attempt_count = COALESCE(?, attempt_count), scheduled_at = COALESCE(?, scheduled_at),
        error_message = ?, claim_token = NULL, claimed_at = NULL, updated_at = ?
      WHERE id = ? AND status = 'PROCESSING' AND claim_token = ?
    `
    )
    .run(attemptCount, options.scheduledAt || null,
      String(errorMessage || "Falha ao enviar notificação.").slice(0, 500), new Date().toISOString(), id,
      options.claimToken);
  return result.changes === 1;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  DEFAULT_CLAIM_TIMEOUT_MS,
  cancel,
  claimPending,
  createPending,
  listForAdmin,
  listPending,
  listPendingEmail,
  markFailed,
  markSent,
  resend,
};
