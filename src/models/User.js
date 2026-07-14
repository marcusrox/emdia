const { getDatabase } = require("../database/connection");
const { hashPassword, verifyPassword } = require("../services/authService");
const { newId } = require("../services/id");

const DEFAULT_EMAIL = "usuario@emdia.local";
const DEFAULT_PASSWORD = process.env.EMDIA_DEFAULT_PASSWORD || "emdia123";
const FONT_SCALE_OPTIONS = new Set(["small", "medium", "large"]);
const DEFAULT_FONT_SCALE = "medium";
const LIST_DENSITY_OPTIONS = new Set(["comfortable", "standard", "compact"]);
const DEFAULT_LIST_DENSITY = "standard";

function normalizeFontScale(value) {
  const scale = String(value || "").trim();
  return FONT_SCALE_OPTIONS.has(scale) ? scale : DEFAULT_FONT_SCALE;
}

function normalizeListDensity(value) {
  const density = String(value || "").trim();
  return LIST_DENSITY_OPTIONS.has(density) ? density : DEFAULT_LIST_DENSITY;
}

function getDefaultUser() {
  return getDatabase().prepare("SELECT * FROM users WHERE is_active = 1 ORDER BY created_at LIMIT 1").get();
}

function listActive() {
  return getDatabase().prepare("SELECT * FROM users WHERE is_active = 1 ORDER BY created_at").all();
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

function getById(userId) {
  return getDatabase()
    .prepare("SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1")
    .get(userId);
}

function updateProfile(userId, data) {
  const current = getById(userId);
  if (!current) {
    return { ok: false, errors: ["Usuário não encontrado."], profile: normalizeProfile(data) };
  }

  const profile = normalizeProfile(data);
  const errors = validateProfile(current, profile);
  if (errors.length) {
    return { ok: false, errors, profile };
  }

  const passwordHash = profile.new_password ? hashPassword(profile.new_password) : current.password_hash;

  getDatabase()
    .prepare(
      `
      UPDATE users
      SET name = ?, email = ?, phone_e164 = ?, password_hash = ?, updated_at = ?
      WHERE id = ? AND is_active = 1
    `
    )
    .run(profile.name, profile.email, profile.phone_e164 || null, passwordHash, new Date().toISOString(), userId);

  return { ok: true, user: getById(userId) };
}

function normalizeProfile(data) {
  const phone = normalizePhoneE164(data.phone_e164);

  return {
    name: String(data.name || "").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    phone_e164: phone.value,
    phone_error: phone.error,
    current_password: String(data.current_password || ""),
    new_password: String(data.new_password || ""),
    confirm_password: String(data.confirm_password || ""),
  };
}

function validateProfile(current, profile) {
  const errors = [];
  const wantsPasswordChange = Boolean(profile.current_password || profile.new_password || profile.confirm_password);

  if (!profile.name) {
    errors.push("Informe o nome do usuário.");
  }

  if (!isValidEmail(profile.email)) {
    errors.push("Informe um e-mail válido.");
  } else {
    const emailOwner = findByEmail(profile.email);
    if (emailOwner && emailOwner.id !== current.id) {
      errors.push("Este e-mail já está em uso.");
    }
  }

  if (profile.phone_error) {
    errors.push(profile.phone_error);
  }

  if (wantsPasswordChange) {
    if (!verifyPassword(profile.current_password, current.password_hash)) {
      errors.push("Senha atual incorreta.");
    }

    if (!profile.new_password) {
      errors.push("Informe a nova senha.");
    } else if (profile.new_password.length < 6) {
      errors.push("A nova senha deve ter pelo menos 6 caracteres.");
    }

    if (profile.new_password !== profile.confirm_password) {
      errors.push("A confirmação da nova senha não confere.");
    }
  }

  return errors;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidE164(value) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function normalizePhoneE164(value) {
  const raw = String(value || "").trim();
  if (!raw) return { value: "" };

  const digits = raw.replace(/\D/g, "");
  const withCountry = raw.startsWith("+")
    ? `+${digits}`
    : digits.length === 10 || digits.length === 11
      ? `+55${digits}`
      : `+${digits}`;

  if (!isValidE164(withCountry)) {
    return {
      value: raw,
      error: "Informe um telefone válido, como +5571999999999 ou (71) 99999-9999.",
    };
  }

  return { value: withCountry };
}

function updateFontScale(userId, fontScale) {
  const normalized = normalizeFontScale(fontScale);
  getDatabase()
    .prepare("UPDATE users SET font_scale = ?, updated_at = ? WHERE id = ? AND is_active = 1")
    .run(normalized, new Date().toISOString(), userId);

  return normalized;
}

function updateInterfacePreferences(userId, data) {
  const fontScale = normalizeFontScale(data.font_scale);
  const listDensity = normalizeListDensity(data.list_density);

  getDatabase()
    .prepare("UPDATE users SET font_scale = ?, list_density = ?, updated_at = ? WHERE id = ? AND is_active = 1")
    .run(fontScale, listDensity, new Date().toISOString(), userId);

  return {
    font_scale: fontScale,
    list_density: listDensity,
  };
}

module.exports = {
  DEFAULT_FONT_SCALE,
  DEFAULT_LIST_DENSITY,
  FONT_SCALE_OPTIONS: Array.from(FONT_SCALE_OPTIONS),
  LIST_DENSITY_OPTIONS: Array.from(LIST_DENSITY_OPTIONS),
  findByEmail,
  ensureDefaultUser,
  getById,
  getDefaultUser,
  listActive,
  normalizeFontScale,
  normalizeListDensity,
  updateFontScale,
  updateInterfacePreferences,
  updateProfile,
};
