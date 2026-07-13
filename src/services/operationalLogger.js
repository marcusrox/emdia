const fs = require("node:fs");
const path = require("node:path");

const logDir = path.join(__dirname, "..", "..", "log");
const SENSITIVE_KEYS = [
  "authorization",
  "bankaccount",
  "accountnumber",
  "cookie",
  "csrf",
  "env",
  "headers",
  "password",
  "secret",
  "senha",
  "session",
  "token",
];

function logOperationalEvent(eventData) {
  writeEvent(normalizeEvent(eventData));
}

function logInfo(event, message, context = {}) {
  logOperationalEvent({ ...context, level: "info", event, message });
}

function logWarn(event, message, context = {}) {
  logOperationalEvent({ ...context, level: "warn", event, message });
}

function logError(event, message, context = {}) {
  logOperationalEvent({ ...context, level: "error", event, message });
}

function writeEvent(eventData) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(getLogFilePath(), `${JSON.stringify(eventData)}\n`, "utf8");
  } catch (error) {
    console.error(`Falha ao gravar log operacional: ${error.message}`);
  }
}

function normalizeEvent(eventData = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    level: normalizeLevel(eventData.level),
    event: String(eventData.event || "app.event"),
    message: String(eventData.message || "Evento operacional registrado."),
  };

  const user = eventData.user || null;
  if (user && user.id) event.userId = user.id;
  if (user && user.email) event.username = user.email;

  copyOptional(event, eventData, "entity");
  copyOptional(event, eventData, "entityId");
  copyOptional(event, eventData, "competenceMonth");
  copyOptional(event, eventData, "requestId");

  if (eventData.details && typeof eventData.details === "object") {
    event.details = sanitizeValue(eventData.details);
  }

  return event;
}

function normalizeLevel(level) {
  return ["info", "warn", "error"].includes(level) ? level : "info";
}

function copyOptional(target, source, key) {
  if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
    target[key] = source[key];
  }
}

function sanitizeValue(value, depth = 0) {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
  if (typeof value !== "object") return value;

  return Object.entries(value).reduce((safe, [key, item]) => {
    safe[key] = isSensitiveKey(key) ? "[redacted]" : sanitizeValue(item, depth + 1);
    return safe;
  }, {});
}

function isSensitiveKey(key) {
  const normalized = String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_KEYS.some((sensitiveKey) => normalized.includes(sensitiveKey));
}

function getLogFilePath(date = new Date()) {
  return path.join(logDir, `operacional-${formatLocalDate(date)}.log`);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  getLogFilePath,
  logError,
  logInfo,
  logOperationalEvent,
  logWarn,
  sanitizeValue,
};
