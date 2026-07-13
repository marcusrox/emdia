const { getDatabase } = require("../database/connection");
const AuditLog = require("./AuditLog");
const { newId } = require("../services/id");

function list(userId) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM categories
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY entry_type, name
    `)
    .all(userId);
}

function byType(userId, entryType) {
  return list(userId).filter((category) => category.entry_type === entryType || category.entry_type === "BOTH");
}

function listDeleted(userId) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM categories
      WHERE user_id = ? AND deleted_at IS NOT NULL
      ORDER BY deleted_at DESC, entry_type, name
    `)
    .all(userId);
}

function create(userId, data) {
  const now = new Date().toISOString();
  const id = newId("cat");

  getDatabase()
    .prepare(`
      INSERT INTO categories (
        id, user_id, name, entry_type, icon, color, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      userId,
      data.name,
      data.entry_type || "EXPENSE",
      data.icon || null,
      data.color || "#0f766e",
      now,
      now
    );

  AuditLog.record(userId, "category", id, "created", { name: data.name, entry_type: data.entry_type || "EXPENSE" });
  return getById(userId, id);
}

function update(userId, id, data) {
  const now = new Date().toISOString();

  const result = getDatabase()
    .prepare(`
      UPDATE categories
      SET
        name = ?,
        entry_type = ?,
        icon = ?,
        color = ?,
        updated_at = ?
      WHERE user_id = ? AND id = ? AND deleted_at IS NULL
    `)
    .run(
      data.name,
      data.entry_type || "EXPENSE",
      data.icon || null,
      data.color || "#0f766e",
      now,
      userId,
      id
    );

  if (result.changes) {
    AuditLog.record(userId, "category", id, "updated", { name: data.name, entry_type: data.entry_type || "EXPENSE" });
  }

  return getById(userId, id);
}

function softDelete(userId, id) {
  const now = new Date().toISOString();
  const existing = getAnyById(userId, id);

  const result = getDatabase()
    .prepare(`
      UPDATE categories
      SET deleted_at = ?, is_active = 0, updated_at = ?
      WHERE user_id = ? AND id = ? AND deleted_at IS NULL
    `)
    .run(now, now, userId, id);

  if (result.changes) {
    AuditLog.record(userId, "category", id, "deleted", { name: existing?.name, entry_type: existing?.entry_type });
  }

  return result;
}

function restore(userId, id) {
  const now = new Date().toISOString();
  const existing = getAnyById(userId, id);

  const result = getDatabase()
    .prepare(`
      UPDATE categories
      SET deleted_at = NULL, is_active = 1, updated_at = ?
      WHERE user_id = ? AND id = ? AND deleted_at IS NOT NULL
    `)
    .run(now, userId, id);

  if (result.changes) {
    AuditLog.record(userId, "category", id, "restored", { name: existing?.name, entry_type: existing?.entry_type });
  }

  return result;
}

function getById(userId, id) {
  return getDatabase()
    .prepare("SELECT * FROM categories WHERE user_id = ? AND id = ? AND deleted_at IS NULL")
    .get(userId, id);
}

function getAnyById(userId, id) {
  return getDatabase().prepare("SELECT * FROM categories WHERE user_id = ? AND id = ?").get(userId, id);
}

module.exports = {
  byType,
  create,
  getById,
  list,
  listDeleted,
  restore,
  softDelete,
  update,
};
