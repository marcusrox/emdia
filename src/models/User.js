const { getDatabase } = require("../database/connection");
const { hashPassword } = require("../services/authService");
const { newId } = require("../services/id");

const DEFAULT_EMAIL = "usuario@emdia.local";
const DEFAULT_PASSWORD = process.env.EMDIA_DEFAULT_PASSWORD || "emdia123";
const FONT_SCALE_OPTIONS = new Set(["small", "medium", "large"]);
const DEFAULT_FONT_SCALE = "medium";

function normalizeFontScale(value) {
  const scale = String(value || "").trim();
  return FONT_SCALE_OPTIONS.has(scale) ? scale : DEFAULT_FONT_SCALE;
}

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

function updateFontScale(userId, fontScale) {
  const normalized = normalizeFontScale(fontScale);
  getDatabase()
    .prepare("UPDATE users SET font_scale = ?, updated_at = ? WHERE id = ? AND is_active = 1")
    .run(normalized, new Date().toISOString(), userId);

  return normalized;
}

module.exports = {
  DEFAULT_FONT_SCALE,
  FONT_SCALE_OPTIONS: Array.from(FONT_SCALE_OPTIONS),
  findByEmail,
  ensureDefaultUser,
  getDefaultUser,
  normalizeFontScale,
  updateFontScale,
};
