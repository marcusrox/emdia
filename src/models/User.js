const { getDatabase } = require("../database/connection");
const { newId } = require("../services/id");

function getDefaultUser() {
  return getDatabase().prepare("SELECT * FROM users WHERE is_active = 1 ORDER BY created_at LIMIT 1").get();
}

function ensureDefaultUser() {
  const existing = getDefaultUser();
  if (existing) return existing;

  const now = new Date().toISOString();
  const user = {
    id: newId("usr"),
    name: "Usuário EmDia",
    email: "usuario@emdia.local",
    password_hash: "local-mvp",
    timezone: "America/Bahia",
    locale: "pt-BR",
    created_at: now,
    updated_at: now,
  };

  getDatabase()
    .prepare(`
      INSERT INTO users (
        id, name, email, password_hash, timezone, locale, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      user.id,
      user.name,
      user.email,
      user.password_hash,
      user.timezone,
      user.locale,
      user.created_at,
      user.updated_at
    );

  return getDefaultUser();
}

module.exports = {
  ensureDefaultUser,
  getDefaultUser,
};
