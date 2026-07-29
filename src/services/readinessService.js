const { getDatabase } = require("../database/connection");
const { loadMigrations } = require("../database/migrator");

const DEFAULT_TIMEOUT_MS = 1000;

function checkReadiness(options = {}) {
  const now = options.now || Date.now;
  const startedAt = now();
  const timeoutMs = positiveInteger(options.timeoutMs, process.env.EMDIA_READINESS_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const db = options.db || getDatabase();

  try {
    const database = db.prepare("SELECT 1 AS ok").get();
    if (database?.ok !== 1) return failure("database-query");

    const expected = (options.migrations || loadMigrations()).map((migration) => migration.id);
    const applied = new Set(db.prepare("SELECT id FROM schema_migrations").all().map((row) => row.id));
    if (expected.some((id) => !applied.has(id))) return failure("migrations-pending");
    if (now() - startedAt > timeoutMs) return failure("timeout");

    return {
      ok: true,
      payload: {
        ok: true,
        service: "emdia",
        database: "ready",
        migrations: "ready",
      },
    };
  } catch (error) {
    return failure("database-unavailable", error);
  }
}

function failure(reason, error = null) {
  return {
    ok: false,
    reason,
    error,
    payload: {
      ok: false,
      service: "emdia",
      error: "Dependência obrigatória indisponível.",
    },
  };
}

function positiveInteger(explicitValue, environmentValue, fallback) {
  const value = Number(explicitValue ?? environmentValue);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  checkReadiness,
};
