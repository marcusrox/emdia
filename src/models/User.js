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

function listAll() {
  return getDatabase().prepare("SELECT id, name, email, is_active FROM users ORDER BY name, email").all();
}

function listForAdmin(filters = {}) {
  const clauses = ["1 = 1"];
  const params = [];
  const q = String(filters.q || "").trim();

  if (q) {
    clauses.push("(name LIKE ? OR email LIKE ? OR COALESCE(phone_e164, '') LIKE ?)");
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern);
  }
  if (filters.role === "admin") clauses.push("is_admin = 1");
  if (filters.role === "user") clauses.push("is_admin = 0");
  if (filters.status === "active") clauses.push("is_active = 1");
  if (filters.status === "blocked") clauses.push("is_active = 0");

  return getDatabase().prepare(`
    SELECT id, name, email, phone_e164, timezone, locale, is_active, is_admin, created_at, updated_at
    FROM users WHERE ${clauses.join(" AND ")} ORDER BY name, email
  `).all(...params);
}

function getAdminById(userId) {
  return getDatabase().prepare(`
    SELECT id, name, email, phone_e164, timezone, locale, is_active, is_admin, created_at, updated_at
    FROM users WHERE id = ? LIMIT 1
  `).get(userId);
}

function createAdmin(data) {
  const values = normalizeAdminData(data, { requirePassword: true });
  const errors = validateAdminData(values, { requirePassword: true });
  if (Object.keys(errors).length) return { ok: false, errors, values };

  const now = new Date().toISOString();
  const id = newId("usr");
  getDatabase().prepare(`
    INSERT INTO users (id, name, email, password_hash, phone_e164, timezone, locale, is_active, is_admin, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, values.name, values.email, hashPassword(values.new_password), values.phone_e164 || null,
    values.timezone, values.locale, values.is_active, values.is_admin, now, now);
  return { ok: true, user: getAdminById(id) };
}

function updateAdmin(actorId, userId, data) {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = getAdminById(userId);
    if (!current) { db.exec("ROLLBACK"); return { ok: false, notFound: true }; }
    const values = normalizeAdminData(data, { current });
    const errors = validateAdminData(values, { current, actorId });
    if (Object.keys(errors).length) { db.exec("ROLLBACK"); return { ok: false, errors, values: { ...current, ...values } }; }
    db.prepare(`
      UPDATE users SET name = ?, email = ?, phone_e164 = ?, timezone = ?, locale = ?, is_admin = ?, updated_at = ?
      WHERE id = ?
    `).run(values.name, values.email, values.phone_e164 || null, values.timezone, values.locale,
      values.is_admin, new Date().toISOString(), userId);
    db.exec("COMMIT");
    return { ok: true, user: getAdminById(userId), previous: current };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

function setActiveAdmin(actorId, userId, isActive) {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = getAdminById(userId);
    if (!current) { db.exec("ROLLBACK"); return { ok: false, reason: "not-found" }; }
    if (!isActive && actorId === userId) { db.exec("ROLLBACK"); return { ok: false, reason: "self-block" }; }
    if (!isActive && current.is_admin && current.is_active && countActiveAdmins() <= 1) {
      db.exec("ROLLBACK"); return { ok: false, reason: "last-admin" };
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?").run(isActive ? 1 : 0, now, userId);
    if (!isActive) db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(now, userId);
    db.exec("COMMIT");
    return { ok: true, user: getAdminById(userId), previous: current };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

function resetPasswordAdmin(userId, data) {
  const current = getAdminById(userId);
  if (!current) return { ok: false, notFound: true };
  const newPassword = String(data.new_password || "");
  const confirmPassword = String(data.confirm_password || "");
  const errors = {};
  if (newPassword.length < 6) errors.new_password = "A nova senha deve ter pelo menos 6 caracteres.";
  if (newPassword !== confirmPassword) errors.confirm_password = "A confirmação da nova senha não confere.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const db = getDatabase();
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .run(hashPassword(newPassword), now, userId);
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(now, userId);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return { ok: true, user: getAdminById(userId) };
}

function normalizeAdminData(data, { current = null } = {}) {
  const phone = normalizePhoneE164(data.phone_e164);
  return {
    name: String(data.name || "").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    phone_e164: phone.value,
    phone_error: phone.error,
    timezone: String(data.timezone || current?.timezone || "America/Sao_Paulo").trim(),
    locale: String(data.locale || current?.locale || "pt-BR").trim(),
    is_admin: String(data.role || (current?.is_admin ? "admin" : "user")) === "admin" ? 1 : 0,
    is_active: data.status ? (String(data.status) === "blocked" ? 0 : 1) : (current?.is_active ?? 1),
    new_password: String(data.new_password || ""),
    confirm_password: String(data.confirm_password || ""),
  };
}

function validateAdminData(values, { current = null, actorId = null, requirePassword = false } = {}) {
  const errors = {};
  if (!values.name) errors.name = "Informe o nome do usuário.";
  if (!isValidEmail(values.email)) errors.email = "Informe um e-mail válido.";
  else {
    const owner = getDatabase().prepare("SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1").get(values.email);
    if (owner && owner.id !== current?.id) errors.email = "Este e-mail já está em uso.";
  }
  if (values.phone_error) errors.phone_e164 = values.phone_error;
  if (!isValidTimeZone(values.timezone)) errors.timezone = "Informe um fuso horário válido.";
  if (!isValidLocale(values.locale)) errors.locale = "Informe uma localidade válida, como pt-BR.";
  if (requirePassword) {
    if (values.new_password.length < 6) errors.new_password = "A senha deve ter pelo menos 6 caracteres.";
    if (values.new_password !== values.confirm_password) errors.confirm_password = "A confirmação da senha não confere.";
  }
  if (current && actorId === current.id && !values.is_admin) errors.role = "Você não pode remover o próprio perfil administrativo.";
  if (current && current.is_admin && current.is_active && !values.is_admin && countActiveAdmins() <= 1) {
    errors.role = "Não é possível rebaixar o último administrador ativo.";
  }
  return errors;
}

function countActiveAdmins() {
  return getDatabase().prepare("SELECT COUNT(*) AS total FROM users WHERE is_active = 1 AND is_admin = 1").get().total;
}

function isValidTimeZone(value) {
  try { new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format(); return true; } catch (error) { return false; }
}

function isValidLocale(value) {
  try { return Intl.getCanonicalLocales(value).length === 1; } catch (error) { return false; }
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
        id, name, email, password_hash, timezone, locale, is_admin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
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
  listAll,
  listForAdmin,
  getAdminById,
  createAdmin,
  updateAdmin,
  setActiveAdmin,
  resetPasswordAdmin,
  normalizeFontScale,
  normalizeListDensity,
  updateFontScale,
  updateInterfacePreferences,
  updateProfile,
};
