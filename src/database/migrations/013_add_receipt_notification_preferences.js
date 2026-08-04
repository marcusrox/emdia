module.exports = {
  id: "013_add_receipt_notification_preferences",
  description: "Adiciona preferências de notificações WhatsApp para comprovantes",
  up(db) {
    db.exec(`
      ALTER TABLE notification_preferences
        ADD COLUMN receipt_queue_failure_enabled INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE notification_preferences
        ADD COLUMN receipt_processing_failure_enabled INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE notification_preferences
        ADD COLUMN receipt_ready_review_enabled INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE notification_preferences
        ADD COLUMN receipt_approved_enabled INTEGER NOT NULL DEFAULT 1;
    `);
  },
};
