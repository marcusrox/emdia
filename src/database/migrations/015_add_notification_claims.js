module.exports = {
  id: "015_add_notification_claims",
  description: "Adiciona reivindicação recuperável à outbox de notificações",
  up(db) {
    const columns = new Set(db.prepare("PRAGMA table_info(notifications)").all().map((column) => column.name));
    if (!columns.has("claim_token")) {
      db.exec("ALTER TABLE notifications ADD COLUMN claim_token TEXT;");
    }
    if (!columns.has("claimed_at")) {
      db.exec("ALTER TABLE notifications ADD COLUMN claimed_at TEXT;");
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_claim_queue
      ON notifications(channel, status, scheduled_at, claimed_at, attempt_count);

      CREATE INDEX IF NOT EXISTS idx_notifications_claim_token
      ON notifications(claim_token)
      WHERE claim_token IS NOT NULL;
    `);
  },
};
