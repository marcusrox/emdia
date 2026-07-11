const { getDatabase } = require("../database/connection");
const { hashPassword } = require("../services/authService");
const { newId } = require("../services/id");

const DEFAULT_EMAIL = "usuario@emdia.local";
const DEFAULT_PASSWORD = process.env.EMDIA_DEFAULT_PASSWORD || "emdia123";

function getDefaultUser() {
  return getDatabase().prepare("SELECT * FROM users WHERE is_active = 1 ORDER BY created_at LIMIT 1").get();
}

function ensureDefaultUser() {
  const existing = getDefaultUser();
  if (existing) {
    if (existing.password_hash === "local-mvp") {
      getDatabase()
        .prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
        .run(hashPassword(DEFAULT_PASSWORD), new Date().toISOString(), existing.id);
      return getDefaultUser();
    }

    return existing;
  }

  const now = new Date().toISOString();
  const user = {
    id: newId("usr"),
    name: "Usuário EmDia",
    email: DEFAULT_EMAIL,
    password_hash: hashPassword(DEFAULT_PASSWORD),
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

function findByEmail(email) {
  return getDatabase()
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?) AND is_active = 1 LIMIT 1")
    .get(String(email || "").trim());
}

module.exports = {
  findByEmail,
  ensureDefaultUser,
  getDefaultUser,
};
