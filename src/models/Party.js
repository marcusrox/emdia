const { getDatabase } = require("../database/connection");
const { newId } = require("../services/id");

function list(userId) {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM parties
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY name
    `)
    .all(userId);
}

function findOrCreate(userId, name, type = "PAYEE") {
  const cleanName = String(name || "").trim();
  if (!cleanName) return null;

  const existing = getDatabase()
    .prepare("SELECT * FROM parties WHERE user_id = ? AND lower(name) = lower(?) AND deleted_at IS NULL")
    .get(userId, cleanName);

  if (existing) return existing;

  const now = new Date().toISOString();
  const id = newId("pty");

  getDatabase()
    .prepare(`
      INSERT INTO parties (
        id, user_id, name, party_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(id, userId, cleanName, type, now, now);

  return getDatabase().prepare("SELECT * FROM parties WHERE id = ?").get(id);
}

module.exports = {
  findOrCreate,
  list,
};
