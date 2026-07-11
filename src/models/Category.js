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
};
