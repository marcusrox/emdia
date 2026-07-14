const { logInfo, logWarn } = require("./operationalLogger");
const { runNotificationCycle } = require("./notificationService");

let scheduler = null;
let running = false;

function startNotificationScheduler() {
  if (scheduler || process.env.WHATSAPP_NOTIFICATIONS_DISABLED === "1") return;

  const intervalMs = Math.max(Number(process.env.WHATSAPP_NOTIFICATION_INTERVAL_MS || 60000), 15000);
  scheduler = setInterval(() => {
    runSafely();
  }, intervalMs);
  scheduler.unref?.();

  logInfo("whatsapp.scheduler.started", "Scheduler de notificações WhatsApp iniciado.", {
    details: { intervalMs },
  });
  runSafely();
}

async function runSafely() {
  if (running) return;
  running = true;

  try {
    await runNotificationCycle();
  } catch (error) {
    logWarn("whatsapp.scheduler.failed", "Ciclo de notificações WhatsApp falhou.", {
      details: { message: error.message },
    });
  } finally {
    running = false;
  }
}

module.exports = {
  startNotificationScheduler,
};
