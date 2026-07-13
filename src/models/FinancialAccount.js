const { getDatabase } = require("../database/connection");
const AuditLog = require("./AuditLog");
const { newId } = require("../services/id");
const { toCents } = require("../services/moneyService");

function list(userId) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM financial_accounts
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY is_active DESC, name
    `)
    .all(userId);
}

function active(userId) {
  return list(userId).filter((account) => account.is_active);
}

function listDeleted(userId) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM financial_accounts
      WHERE user_id = ? AND deleted_at IS NOT NULL
      ORDER BY deleted_at DESC, name
    `)
    .all(userId);
}

function create(userId, data) {
  const now = new Date().toISOString();
  const id = newId("acc");

  getDatabase()
    .prepare(`
      INSERT INTO financial_accounts (
        id, user_id, name, type, institution_name, initial_balance_cents,
        initial_balance_date, icon, color, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      userId,
      data.name,
      data.type || "CHECKING",
      data.institution_name || null,
      toCents(data.initial_balance),
      data.initial_balance_date || null,
      data.icon || null,
      data.color || "#2563eb",
      now,
      now
    );

  AuditLog.record(userId, "financial_account", id, "created", { name: data.name, type: data.type || "CHECKING" });
  return getById(userId, id);
}

function update(userId, id, data) {
  const now = new Date().toISOString();

  const result = getDatabase()
    .prepare(`
      UPDATE financial_accounts
      SET
        name = ?,
        type = ?,
        institution_name = ?,
        initial_balance_cents = ?,
        initial_balance_date = ?,
        icon = ?,
        color = ?,
        updated_at = ?
      WHERE user_id = ? AND id = ? AND deleted_at IS NULL
    `)
    .run(
      data.name,
      data.type || "CHECKING",
      data.institution_name || null,
      toCents(data.initial_balance),
      data.initial_balance_date || null,
      data.icon || null,
      data.color || "#2563eb",
      now,
      userId,
      id
    );

  if (result.changes) {
    AuditLog.record(userId, "financial_account", id, "updated", { name: data.name, type: data.type || "CHECKING" });
  }

  return getById(userId, id);
}

function softDelete(userId, id) {
  const now = new Date().toISOString();
  const existing = getAnyById(userId, id);

  const result = getDatabase()
    .prepare(`
      UPDATE financial_accounts
      SET deleted_at = ?, is_active = 0, updated_at = ?
      WHERE user_id = ? AND id = ? AND deleted_at IS NULL
    `)
    .run(now, now, userId, id);

  if (result.changes) {
    AuditLog.record(userId, "financial_account", id, "deleted", { name: existing?.name });
  }

  return result;
}

function restore(userId, id) {
  const now = new Date().toISOString();
  const existing = getAnyById(userId, id);

  const result = getDatabase()
    .prepare(`
      UPDATE financial_accounts
      SET deleted_at = NULL, is_active = 1, updated_at = ?
      WHERE user_id = ? AND id = ? AND deleted_at IS NOT NULL
    `)
    .run(now, userId, id);

  if (result.changes) {
    AuditLog.record(userId, "financial_account", id, "restored", { name: existing?.name });
  }

  return result;
}

function getById(userId, id) {
  return getDatabase()
    .prepare("SELECT * FROM financial_accounts WHERE user_id = ? AND id = ? AND deleted_at IS NULL")
    .get(userId, id);
}

function getAnyById(userId, id) {
  return getDatabase().prepare("SELECT * FROM financial_accounts WHERE user_id = ? AND id = ?").get(userId, id);
}

module.exports = {
  active,
  create,
  getById,
  list,
  listDeleted,
  restore,
  softDelete,
  update,
};
