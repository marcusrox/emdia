const { logError, logInfo } = require("./operationalLogger");
const { runEmailNotificationCycle } = require("./emailNotificationService");

let scheduler = null;
let running = false;

function startEmailNotificationScheduler() {
  if (scheduler || process.env.EMAIL_NOTIFICATIONS_DISABLED === "1") return;
  const intervalMs = Math.max(positiveInteger(process.env.EMAIL_NOTIFICATION_INTERVAL_MS, 60000), 15000);
  runSafely();
  scheduler = setInterval(runSafely, intervalMs);
  scheduler.unref?.();
  logInfo("email.scheduler.started", "Agendador de notificações por e-mail iniciado.", {
    details: { intervalMs, provider: process.env.EMAIL_PROVIDER || defaultProvider() },
  });
}

async function runSafely() {
  if (running) return;
  running = true;
  try {
    await runEmailNotificationCycle();
  } catch (error) {
    logError("email.scheduler.failed", "Falha no ciclo do agendador de e-mail.", {
      details: { errorCode: String(error?.code || "unexpected_error") },
    });
  } finally {
    running = false;
  }
}

function defaultProvider() {
  return process.env.NODE_ENV === "production" ? "resend" : "mock";
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = { startEmailNotificationScheduler };
