const { getDatabase } = require("../database/connection");
const { newId } = require("../services/id");

const DEFAULT_OFFSETS = [5, 2, 0];

function getOrCreate(userId) {
  const existing = getByUserId(userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  getDatabase()
    .prepare(
      `
      INSERT INTO notification_preferences (
        id, user_id, whatsapp_enabled, daily_summary_enabled,
        daily_summary_time, due_reminder_offsets_json,
        overdue_reminder_interval_days, created_at, updated_at
      ) VALUES (?, ?, 0, 1, '08:00', ?, 3, ?, ?)
    `
    )
    .run(newId("npr"), userId, JSON.stringify(DEFAULT_OFFSETS), now, now);

  return getByUserId(userId);
}

function getByUserId(userId) {
  return getDatabase()
    .prepare("SELECT * FROM notification_preferences WHERE user_id = ? LIMIT 1")
    .get(userId);
}

function update(userId, data) {
  const current = getOrCreate(userId);
  const normalized = normalizePreferences(data, current);

  getDatabase()
    .prepare(
      `
      UPDATE notification_preferences
      SET whatsapp_enabled = ?, daily_summary_enabled = ?,
        daily_summary_time = ?, due_reminder_offsets_json = ?,
        overdue_reminder_interval_days = ?, updated_at = ?
      WHERE user_id = ?
    `
    )
    .run(
      normalized.whatsapp_enabled ? 1 : 0,
      normalized.daily_summary_enabled ? 1 : 0,
      normalized.daily_summary_time,
      JSON.stringify(normalized.due_reminder_offsets),
      normalized.overdue_reminder_interval_days,
      new Date().toISOString(),
      userId
    );

  return getByUserId(userId);
}

function normalizePreferences(data = {}, current = {}) {
  return {
    whatsapp_enabled: data.whatsapp_enabled === "on" || data.whatsapp_enabled === "1",
    daily_summary_enabled: data.daily_summary_enabled === "on" || data.daily_summary_enabled === "1",
    daily_summary_time: normalizeTime(data.daily_summary_time || current.daily_summary_time),
    due_reminder_offsets: normalizeOffsets(data.due_reminder_offsets || current.due_reminder_offsets_json),
    overdue_reminder_interval_days: normalizePositiveInteger(
      data.overdue_reminder_interval_days || current.overdue_reminder_interval_days,
      3
    ),
  };
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(raw) ? raw : "08:00";
}

function normalizeOffsets(value) {
  if (Array.isArray(value)) return normalizeOffsetArray(value);

  const raw = String(value || "").trim();
  try {
    const parsed = raw.startsWith("[") ? JSON.parse(raw) : raw.split(",");
    return normalizeOffsetArray(parsed);
  } catch (error) {
    return DEFAULT_OFFSETS;
  }
}

function normalizeOffsetArray(values) {
  const offsets = values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 30);

  return Array.from(new Set(offsets)).sort((a, b) => b - a).slice(0, 6);
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 30) : fallback;
}

function offsetsFromPreference(preference) {
  return normalizeOffsets(preference?.due_reminder_offsets_json);
}

module.exports = {
  DEFAULT_OFFSETS,
  getOrCreate,
  normalizePreferences,
  offsetsFromPreference,
  update,
};
