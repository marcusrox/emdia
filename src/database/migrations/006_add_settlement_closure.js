module.exports = {
  id: "006_add_settlement_closure",
  description: "Registra baixas que quitam lançamentos abaixo do previsto",
  up(db) {
    const columns = db.prepare("PRAGMA table_info(settlements)").all();
    const columnNames = new Set(columns.map((column) => column.name));

    if (!columnNames.has("closes_entry")) {
      db.exec(`
        ALTER TABLE settlements
        ADD COLUMN closes_entry INTEGER NOT NULL DEFAULT 0
        CHECK (closes_entry IN (0, 1));
      `);
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_settlements_entry_closure
      ON settlements(financial_entry_id, closes_entry);
    `);
  },
};
