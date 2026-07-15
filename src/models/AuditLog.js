const { getDatabase } = require("../database/connection");
const { newId } = require("../services/id");

const SENSITIVE_KEYS = [
  "authorization",
  "bankaccount",
  "accountnumber",
  "cookie",
  "csrf",
  "env",
  "headers",
  "password",
  "passwordhash",
  "secret",
  "senha",
  "session",
  "token",
];

function record(userId, entityType, entityId, action, payload = {}) {
  getDatabase()
    .prepare(`
      INSERT INTO audit_logs (
        id, user_id, entity_type, entity_id, action, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      newId("aud"),
      userId,
      entityType,
      entityId,
      action,
      JSON.stringify(sanitizePayload(payload)),
      new Date().toISOString()
    );
}

function list(userId, filters = {}) {
  const params = [userId];
  const clauses = ["audit_logs.user_id = ?"];
  const limit = normalizeLimit(filters.limit);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  if (filters.from_date) {
    clauses.push("audit_logs.created_at >= ?");
    params.push(`${filters.from_date}T00:00:00.000Z`);
  }

  if (filters.to_date) {
    clauses.push("audit_logs.created_at <= ?");
    params.push(`${filters.to_date}T23:59:59.999Z`);
  }

  if (filters.entity_type) {
    clauses.push("audit_logs.entity_type = ?");
    params.push(filters.entity_type);
  }

  if (filters.entity_id) {
    clauses.push("audit_logs.entity_id = ?");
    params.push(filters.entity_id);
  }

  if (filters.action) {
    clauses.push("audit_logs.action = ?");
    params.push(filters.action);
  }

  if (filters.q) {
    clauses.push(
      "(audit_logs.entity_type LIKE ? OR audit_logs.entity_id LIKE ? OR audit_logs.action LIKE ? OR audit_logs.payload_json LIKE ?)"
    );
    const q = `%${filters.q}%`;
    params.push(q, q, q, q);
  }

  return getDatabase()
    .prepare(
      `
      SELECT audit_logs.*, users.email AS user_email, users.name AS user_name
      FROM audit_logs
      LEFT JOIN users ON users.id = audit_logs.user_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY audit_logs.created_at DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(...params, limit, offset);
}

function getById(userId, id) {
  return getDatabase()
    .prepare(
      `
      SELECT audit_logs.*, users.email AS user_email, users.name AS user_name
      FROM audit_logs
      LEFT JOIN users ON users.id = audit_logs.user_id
      WHERE audit_logs.user_id = ? AND audit_logs.id = ?
      LIMIT 1
    `
    )
    .get(userId, id);
}

function listEntityHistory(userId, entityType, entityId) {
  return getDatabase()
    .prepare(
      `
      SELECT audit_logs.*, users.email AS user_email, users.name AS user_name
      FROM audit_logs
      LEFT JOIN users ON users.id = audit_logs.user_id
      WHERE audit_logs.user_id = ?
        AND audit_logs.entity_type = ?
        AND audit_logs.entity_id = ?
      ORDER BY audit_logs.created_at ASC
    `
    )
    .all(userId, entityType, entityId);
}

function sanitizePayload(value, depth = 0) {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitizePayload(item, depth + 1));
  if (typeof value === "string") return value.length > 300 ? `${value.slice(0, 300)}...` : value;
  if (typeof value !== "object") return value;

  return Object.entries(value).reduce((safe, [key, item]) => {
    safe[key] = isSensitiveKey(key) ? "[redacted]" : sanitizePayload(item, depth + 1);
    return safe;
  }, {});
}

function isSensitiveKey(key) {
  const normalized = String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_KEYS.some((sensitiveKey) => normalized.includes(sensitiveKey));
}

function normalizeLimit(limit) {
  const value = Number(limit) || 100;
  return Math.min(Math.max(value, 1), 200);
}

module.exports = {
  getById,
  list,
  listEntityHistory,
  record,
  sanitizePayload,
};
