const crypto = require("node:crypto");
const { getDatabase } = require("../database/connection");

const COOKIE_NAME = "emdia_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const SCRYPT_KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(String(password || ""), salt, SCRYPT_KEY_LENGTH).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [scheme, salt, storedHash] = String(passwordHash || "").split("$");
  if (scheme !== "scrypt" || !salt || !storedHash) return false;

  const expected = Buffer.from(storedHash, "base64url");
  const actual = crypto.scryptSync(String(password || ""), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator === -1) return cookies;

      const name = part.slice(0, separator);
      const value = part.slice(separator + 1);
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (error) {
        cookies[name] = "";
      }
      return cookies;
    }, {});
}

function sessionHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function createSession(userId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  const token = crypto.randomBytes(32).toString("base64url");

  getDatabase()
    .prepare(
      `
      INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .run(crypto.randomUUID(), userId, sessionHash(token), now.toISOString(), expiresAt.toISOString());

  return {
    token,
    cookie: buildSessionCookie(token, SESSION_MAX_AGE_SECONDS),
  };
}

function getSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;

  const now = new Date().toISOString();
  return getDatabase()
    .prepare(
      `
      SELECT sessions.*, users.name, users.email, users.timezone, users.locale, users.is_active, users.font_scale
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
        AND sessions.revoked_at IS NULL
        AND sessions.expires_at > ?
        AND users.is_active = 1
    `
    )
    .get(sessionHash(token), now);
}

function invalidateSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return;

  getDatabase()
    .prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .run(new Date().toISOString(), sessionHash(token));
}

function buildSessionCookie(token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function csrfToken(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return "";

  return crypto.createHash("sha256").update(`csrf:${token}`).digest("base64url");
}

function verifyCsrf(req, body) {
  const expected = csrfToken(req);
  const received = String(body._csrf || "");
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

module.exports = {
  clearSessionCookie,
  createSession,
  csrfToken,
  getSession,
  hashPassword,
  invalidateSession,
  verifyCsrf,
  verifyPassword,
};
