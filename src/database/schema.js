const { getDatabase } = require("./connection");

function initializeDatabase() {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone_e164 TEXT,
      timezone TEXT NOT NULL DEFAULT 'America/Bahia',
      locale TEXT NOT NULL DEFAULT 'pt-BR',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS financial_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      institution_name TEXT,
      initial_balance_cents INTEGER NOT NULL DEFAULT 0,
      initial_balance_date TEXT,
      icon TEXT,
      color TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      parent_id TEXT REFERENCES categories(id),
      name TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      party_type TEXT NOT NULL,
      document_number TEXT,
      email TEXT,
      phone TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS financial_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      entry_type TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id TEXT REFERENCES categories(id),
      party_id TEXT REFERENCES parties(id),
      expected_account_id TEXT REFERENCES financial_accounts(id),
      actual_account_id TEXT REFERENCES financial_accounts(id),
      expected_amount_cents INTEGER NOT NULL,
      realized_amount_cents INTEGER NOT NULL DEFAULT 0,
      issue_date TEXT,
      competence_month TEXT NOT NULL,
      due_date TEXT NOT NULL,
      settled_at TEXT,
      status TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'MANUAL',
      recurrence_rule_id TEXT,
      installment_group_id TEXT,
      installment_number INTEGER,
      installment_count INTEGER,
      external_reference TEXT,
      barcode TEXT,
      digitable_line TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      financial_entry_id TEXT NOT NULL REFERENCES financial_entries(id),
      financial_account_id TEXT NOT NULL REFERENCES financial_accounts(id),
      settlement_type TEXT NOT NULL,
      principal_cents INTEGER NOT NULL,
      interest_cents INTEGER NOT NULL DEFAULT 0,
      penalty_cents INTEGER NOT NULL DEFAULT 0,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      other_adjustment_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL,
      settled_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      reversed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user_competence
      ON financial_entries(user_id, competence_month, deleted_at);

    CREATE INDEX IF NOT EXISTS idx_sessions_token
      ON sessions(token_hash, revoked_at, expires_at);

    CREATE INDEX IF NOT EXISTS idx_entries_due_date
      ON financial_entries(user_id, due_date, status);

    CREATE INDEX IF NOT EXISTS idx_settlements_entry
      ON settlements(financial_entry_id, reversed_at);
  `);

  ensureColumn(db, "users", "font_scale", "TEXT NOT NULL DEFAULT 'medium'");
  ensureColumn(db, "users", "list_density", "TEXT NOT NULL DEFAULT 'standard'");
}

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.some((column) => column.name === columnName)) return;

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

module.exports = {
  initializeDatabase,
};
