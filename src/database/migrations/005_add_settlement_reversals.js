module.exports = {
  id: "005_add_settlement_reversals",
  description: "Adiciona histórico auditável de estornos de baixas",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settlement_reversals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        financial_entry_id TEXT NOT NULL REFERENCES financial_entries(id),
        settlement_id TEXT NOT NULL UNIQUE REFERENCES settlements(id),
        reason TEXT NOT NULL,
        reversed_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_settlement_reversals_entry
        ON settlement_reversals(user_id, financial_entry_id, reversed_at);
    `);
  },
};
