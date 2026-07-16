module.exports = {
  id: "003_unify_entry_account_remove_issue_date",
  description: "Unifica a conta e remove a data de emissão dos lançamentos",
  up(db) {
    const columns = db.prepare("PRAGMA table_info(financial_entries)").all();
    const columnNames = new Set(columns.map((column) => column.name));

    if (!columnNames.has("financial_account_id")) {
      db.exec(`
        ALTER TABLE financial_entries
        ADD COLUMN financial_account_id TEXT REFERENCES financial_accounts(id);
      `);
    }

    if (columnNames.has("actual_account_id") && columnNames.has("expected_account_id")) {
      db.exec(`
        UPDATE financial_entries
        SET financial_account_id = COALESCE(actual_account_id, expected_account_id)
        WHERE financial_account_id IS NULL;
      `);
    } else if (columnNames.has("actual_account_id")) {
      db.exec(`
        UPDATE financial_entries
        SET financial_account_id = actual_account_id
        WHERE financial_account_id IS NULL;
      `);
    } else if (columnNames.has("expected_account_id")) {
      db.exec(`
        UPDATE financial_entries
        SET financial_account_id = expected_account_id
        WHERE financial_account_id IS NULL;
      `);
    }

    dropColumnIfPresent(db, "actual_account_id");
    dropColumnIfPresent(db, "expected_account_id");
    dropColumnIfPresent(db, "issue_date");

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_entries_financial_account
      ON financial_entries(user_id, financial_account_id, competence_month, deleted_at);
    `);
  },
};

function dropColumnIfPresent(db, columnName) {
  const columns = db.prepare("PRAGMA table_info(financial_entries)").all();
  if (!columns.some((column) => column.name === columnName)) return;

  db.exec(`ALTER TABLE financial_entries DROP COLUMN ${columnName};`);
}
