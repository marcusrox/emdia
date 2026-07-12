const { getDatabase } = require("../database/connection");
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

  return getById(userId, id);
}

function update(userId, id, data) {
  const now = new Date().toISOString();

  getDatabase()
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

  return getById(userId, id);
}

function softDelete(userId, id) {
  const now = new Date().toISOString();

  return getDatabase()
    .prepare(`
      UPDATE categories
      SET deleted_at = ?, is_active = 0, updated_at = ?
      WHERE user_id = ? AND id = ? AND deleted_at IS NULL
    `)
    .run(now, now, userId, id);
}

function restore(userId, id) {
  const now = new Date().toISOString();

  return getDatabase()
    .prepare(`
      UPDATE categories
      SET deleted_at = NULL, is_active = 1, updated_at = ?
      WHERE user_id = ? AND id = ? AND deleted_at IS NOT NULL
    `)
    .run(now, userId, id);
}

function getById(userId, id) {
  return getDatabase()
    .prepare("SELECT * FROM categories WHERE user_id = ? AND id = ? AND deleted_at IS NULL")
    .get(userId, id);
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
