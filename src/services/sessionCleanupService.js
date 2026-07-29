const Auth = require("./authService");
const { logInfo, logWarn } = require("./operationalLogger");

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
let scheduler = null;

function startSessionCleanupScheduler() {
  if (scheduler) return;

  const intervalMs = Math.max(
    Number(process.env.EMDIA_SESSION_CLEANUP_INTERVAL_MS || DEFAULT_INTERVAL_MS),
    60 * 1000,
  );
  scheduler = setInterval(runSafely, intervalMs);
  scheduler.unref?.();
  runSafely();
}

function runSafely() {
  try {
    const result = Auth.cleanupSessions();
    logInfo("auth.sessions.cleanup_completed", "Limpeza periódica de sessões concluída.", {
      details: result,
    });
  } catch (error) {
    logWarn("auth.sessions.cleanup_failed", "Falha na limpeza periódica de sessões.", {
      details: { message: error.message },
    });
  }
}

module.exports = {
  startSessionCleanupScheduler,
};
