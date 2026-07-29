const crypto = require("node:crypto");

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function createLoginRateLimiter(options = {}) {
  const maxAttempts = positiveInteger(options.maxAttempts, process.env.EMDIA_LOGIN_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
  const windowMs = positiveInteger(options.windowMs, process.env.EMDIA_LOGIN_WINDOW_MS, DEFAULT_WINDOW_MS);
  const now = options.now || Date.now;
  const attempts = new Map();

  function inspect(req, email) {
    const timestamp = now();
    removeExpired(timestamp);
    const key = attemptKey(req, email);
    const entry = attempts.get(key);

    return {
      blocked: Boolean(entry && entry.count >= maxAttempts && entry.expiresAt > timestamp),
      retryAfterSeconds: entry ? Math.max(1, Math.ceil((entry.expiresAt - timestamp) / 1000)) : 0,
      emailFingerprint: fingerprint(normalizeEmail(email)),
    };
  }

  function recordFailure(req, email) {
    const timestamp = now();
    removeExpired(timestamp);
    const key = attemptKey(req, email);
    const current = attempts.get(key);
    const entry = current && current.expiresAt > timestamp
      ? { count: current.count + 1, expiresAt: current.expiresAt }
      : { count: 1, expiresAt: timestamp + windowMs };

    attempts.set(key, entry);
    return {
      blocked: entry.count >= maxAttempts,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - timestamp) / 1000)),
      emailFingerprint: fingerprint(normalizeEmail(email)),
    };
  }

  function reset(req, email) {
    attempts.delete(attemptKey(req, email));
  }

  function removeExpired(timestamp = now()) {
    attempts.forEach((entry, key) => {
      if (entry.expiresAt <= timestamp) attempts.delete(key);
    });
  }

  return {
    inspect,
    recordFailure,
    reset,
    removeExpired,
    settings: { maxAttempts, windowMs },
  };
}

function attemptKey(req, email) {
  return `${clientIp(req)}:${normalizeEmail(email)}`;
}

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown")
    .trim()
    .toLowerCase()
    .replace(/^::ffff:/, "");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function positiveInteger(explicitValue, environmentValue, fallback) {
  const value = Number(explicitValue ?? environmentValue);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

module.exports = {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_WINDOW_MS,
  createLoginRateLimiter,
  normalizeEmail,
};
