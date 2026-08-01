const crypto = require("node:crypto");

const DEFAULT_SIGNUP_MAX_ATTEMPTS = 5;
const DEFAULT_SIGNUP_WINDOW_MS = 15 * 60 * 1000;

function createSignupRateLimiter(options = {}) {
  const maxAttempts = positiveInteger(
    options.maxAttempts,
    process.env.EMDIA_SIGNUP_MAX_ATTEMPTS,
    DEFAULT_SIGNUP_MAX_ATTEMPTS,
  );
  const windowMs = positiveInteger(
    options.windowMs,
    process.env.EMDIA_SIGNUP_WINDOW_MS,
    DEFAULT_SIGNUP_WINDOW_MS,
  );
  const now = options.now || Date.now;
  const attempts = new Map();

  function consume(req, email) {
    const timestamp = now();
    removeExpired(timestamp);
    const key = clientIp(req);
    const current = attempts.get(key);
    const entry = current && current.expiresAt > timestamp
      ? { count: current.count + 1, expiresAt: current.expiresAt }
      : { count: 1, expiresAt: timestamp + windowMs };

    attempts.set(key, entry);
    return result(entry, timestamp, email, entry.count > maxAttempts);
  }

  function inspect(req, email) {
    const timestamp = now();
    removeExpired(timestamp);
    const entry = attempts.get(clientIp(req));
    return result(entry, timestamp, email, Boolean(entry && entry.count >= maxAttempts));
  }

  function removeExpired(timestamp = now()) {
    attempts.forEach((entry, key) => {
      if (entry.expiresAt <= timestamp) attempts.delete(key);
    });
  }

  return {
    consume,
    inspect,
    removeExpired,
    settings: { maxAttempts, windowMs },
  };
}

function result(entry, timestamp, email, blocked) {
  return {
    blocked,
    retryAfterSeconds: entry ? Math.max(1, Math.ceil((entry.expiresAt - timestamp) / 1000)) : 0,
    emailFingerprint: fingerprint(String(email || "").trim().toLowerCase()),
  };
}

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown")
    .trim()
    .toLowerCase()
    .replace(/^::ffff:/, "");
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function positiveInteger(explicitValue, environmentValue, fallback) {
  const value = Number(explicitValue ?? environmentValue);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

module.exports = {
  DEFAULT_SIGNUP_MAX_ATTEMPTS,
  DEFAULT_SIGNUP_WINDOW_MS,
  createSignupRateLimiter,
};
