const net = require("node:net");

const MAX_CLIENT_IP_LENGTH = 64;

function sendHtml(res, html, statusCode = 200) {
  return res.status(statusCode).type("html").send(html);
}

function redirect(res, location) {
  return res.redirect(303, location);
}

function sendJson(res, payload, statusCode = 200) {
  return res.status(statusCode).type("json").send(JSON.stringify(payload, null, 2));
}

function queryValue(req, name) {
  const value = req.query[name];
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

function safeReturnPath(value, fallback = "/dashboard") {
  const candidate = String(value || "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return fallback;

  try {
    const parsed = new URL(candidate, "http://emdia.local");
    if (parsed.origin !== "http://emdia.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function requestDetails(req, details = {}) {
  return {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    clientIp: requestClientIp(req),
    ...details,
  };
}

function normalizeClientIp(value) {
  const normalized = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, MAX_CLIENT_IP_LENGTH)
    .replace(/^::ffff:/i, "");
  return net.isIP(normalized) ? normalized : "unknown";
}

function requestClientIp(req) {
  const expressIp = normalizeClientIp(req?.ip);
  if (expressIp !== "unknown") return expressIp;
  return normalizeClientIp(req?.socket?.remoteAddress);
}

module.exports = {
  normalizeClientIp,
  queryValue,
  redirect,
  requestClientIp,
  requestDetails,
  safeReturnPath,
  sendHtml,
  sendJson,
};
