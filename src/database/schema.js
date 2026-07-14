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

    CREATE TABLE IF NOT EXISTS recurrences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      description TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      financial_account_id TEXT REFERENCES financial_accounts(id),
      party_id TEXT REFERENCES parties(id),
      expected_amount_cents INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      start_competence_month TEXT NOT NULL,
      end_competence_month TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      whatsapp_enabled INTEGER NOT NULL DEFAULT 0,
      daily_summary_enabled INTEGER NOT NULL DEFAULT 1,
      daily_summary_time TEXT NOT NULL DEFAULT '08:00',
      due_reminder_offsets_json TEXT NOT NULL DEFAULT '[5,2,0]',
      overdue_reminder_interval_days INTEGER NOT NULL DEFAULT 3,
      quiet_hours_start TEXT,
      quiet_hours_end TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      financial_entry_id TEXT REFERENCES financial_entries(id),
      channel TEXT NOT NULL,
      event_type TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      sent_at TEXT,
      status TEXT NOT NULL,
      provider_message_id TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT NOT NULL UNIQUE,
      payload_json TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user_competence
      ON financial_entries(user_id, competence_month, deleted_at);

    CREATE INDEX IF NOT EXISTS idx_sessions_token
      ON sessions(token_hash, revoked_at, expires_at);

    CREATE INDEX IF NOT EXISTS idx_entries_due_date
      ON financial_entries(user_id, due_date, status);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_recurrence_competence
      ON financial_entries(user_id, recurrence_rule_id, competence_month)
      WHERE recurrence_rule_id IS NOT NULL AND deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_recurrences_user_status
      ON recurrences(user_id, status, start_competence_month, end_competence_month);

    CREATE INDEX IF NOT EXISTS idx_settlements_entry
      ON settlements(financial_entry_id, reversed_at);

    CREATE INDEX IF NOT EXISTS idx_notifications_schedule
      ON notifications(status, scheduled_at);
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
