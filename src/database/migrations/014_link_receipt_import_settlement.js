module.exports = {
  id: "014_link_receipt_import_settlement",
  description: "Vincula comprovantes aprovados às respectivas baixas",
  up(db) {
    db.exec(`
      ALTER TABLE receipt_imports
        ADD COLUMN settlement_id TEXT REFERENCES settlements(id);

      CREATE INDEX IF NOT EXISTS idx_receipt_imports_settlement
      ON receipt_imports(user_id, settlement_id)
      WHERE settlement_id IS NOT NULL;
    `);
  },
};
