const { getDatabase } = require("../database/connection");
const { newId } = require("../services/id");

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
      SELECT notifications.*, users.phone_e164, users.name AS user_name, users.timezone
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

function markSent(id, providerMessageId) {
  getDatabase()
    .prepare(
      `
      UPDATE notifications
      SET status = 'SENT', sent_at = ?, provider_message_id = ?,
        error_message = NULL, updated_at = ?
      WHERE id = ?
    `
    )
    .run(new Date().toISOString(), providerMessageId || null, new Date().toISOString(), id);
}

function markFailed(id, errorMessage) {
  getDatabase()
    .prepare(
      `
      UPDATE notifications
      SET status = 'FAILED', attempt_count = attempt_count + 1,
        error_message = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .run(String(errorMessage || "Falha ao enviar notificação.").slice(0, 500), new Date().toISOString(), id);
}

module.exports = {
  cancel,
  createPending,
  listForAdmin,
  listPending,
  markFailed,
  markSent,
  resend,
};
