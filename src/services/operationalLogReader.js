const fs = require("node:fs");
const path = require("node:path");

const logDir = path.join(__dirname, "..", "..", "log");
const LOG_FILE_PATTERN = /^operacional-(\d{4}-\d{2}-\d{2})\.log$/;
const LEVELS = new Set(["info", "warn", "error"]);
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function listLogDates() {
  if (!fs.existsSync(logDir)) return [];

  return fs
    .readdirSync(logDir)
    .map((filename) => filename.match(LOG_FILE_PATTERN))
    .filter(Boolean)
    .map((match) => match[1])
    .sort()
    .reverse();
}

function listOperationalLogs(filters = {}) {
  const dates = listLogDates();
  const normalized = normalizeFilters(filters, dates);

  if (!normalized.date) {
    return { entries: [], filters: normalized, dates };
  }

  const entries = readLogFile(normalized.date)
    .filter((entry) => matchesFilters(entry, normalized))
    .sort((left, right) => compareTimestampDesc(left.timestamp, right.timestamp) || right.lineNumber - left.lineNumber)
    .slice(0, normalized.limit);

  return { entries, filters: normalized, dates };
}

function normalizeFilters(filters = {}, dates = listLogDates()) {
  const requestedDate = String(filters.date || "").trim();
  const date = dates.includes(requestedDate) ? requestedDate : dates[0] || "";
  const level = LEVELS.has(filters.level) ? filters.level : "";
  const limit = normalizeLimit(filters.limit);

  return {
    date,
    level,
    event: String(filters.event || "").trim(),
    q: String(filters.q || "").trim(),
    since: normalizeIsoDate(filters.since),
    limit,
  };
}

function normalizeLimit(value) {
  const limit = Number.parseInt(value, 10);
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(limit, 1), MAX_LIMIT);
}

function normalizeIsoDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function readLogFile(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const filePath = path.join(logDir, `operacional-${date}.log`);
  if (!filePath.startsWith(logDir) || !fs.existsSync(filePath)) return [];

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line, index) => parseLine(line, index + 1))
    .filter(Boolean);
}

function parseLine(line, lineNumber) {
  if (!line.trim()) return null;

  try {
    return normalizeEntry(JSON.parse(line), lineNumber, line);
  } catch (error) {
    return {
      timestamp: "",
      level: "error",
      event: "log.invalid_json",
      message: "Linha de log inválida.",
      details: { raw: line.slice(0, 500) },
      lineNumber,
      rawLine: line,
      invalid: true,
    };
  }
}

function normalizeEntry(entry, lineNumber, rawLine) {
  return {
    timestamp: String(entry.timestamp || ""),
    level: LEVELS.has(entry.level) ? entry.level : "info",
    event: String(entry.event || "app.event"),
    message: String(entry.message || "Evento operacional registrado."),
    userId: entry.userId ? String(entry.userId) : "",
    username: entry.username ? String(entry.username) : "",
    entity: entry.entity ? String(entry.entity) : "",
    entityId: entry.entityId ? String(entry.entityId) : "",
    competenceMonth: entry.competenceMonth ? String(entry.competenceMonth) : "",
    requestId: entry.requestId ? String(entry.requestId) : "",
    details: entry.details && typeof entry.details === "object" ? entry.details : null,
    lineNumber,
    rawLine,
    invalid: false,
  };
}

function matchesFilters(entry, filters) {
  if (filters.level && entry.level !== filters.level) return false;
  if (filters.event && !entry.event.toLowerCase().includes(filters.event.toLowerCase())) return false;
  if (filters.since && (!entry.timestamp || entry.timestamp <= filters.since)) return false;
  if (filters.q && !entrySearchText(entry).includes(filters.q.toLowerCase())) return false;

  return true;
}

function entrySearchText(entry) {
  return [
    entry.timestamp,
    entry.level,
    entry.event,
    entry.message,
    entry.userId,
    entry.username,
    entry.entity,
    entry.entityId,
    entry.competenceMonth,
    entry.requestId,
    detailsSummary(entry.details),
    entry.invalid ? entry.rawLine : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function detailsSummary(details) {
  if (!details || typeof details !== "object") return "";

  try {
    return JSON.stringify(details);
  } catch (error) {
    return "";
  }
}

function compareTimestampDesc(left, right) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return right.localeCompare(left);
}

module.exports = {
  LEVELS,
  detailsSummary,
  listLogDates,
  listOperationalLogs,
};
