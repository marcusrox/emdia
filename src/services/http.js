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

function requestDetails(req, details = {}) {
  return {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    clientIp: normalizeClientIp(req.ip || req.socket?.remoteAddress),
    ...details,
  };
}

function normalizeClientIp(value) {
  return String(value || "").trim().replace(/^::ffff:/i, "") || "unknown";
}

module.exports = {
  queryValue,
  redirect,
  requestDetails,
  sendHtml,
  sendJson,
};
