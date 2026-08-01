module.exports = {
  id: "010_add_receipt_imports",
  up(db) {
    const duplicatePhones = db.prepare(`
      SELECT 1
      FROM users
      WHERE phone_e164 IS NOT NULL AND phone_e164 <> ''
      GROUP BY phone_e164
      HAVING COUNT(*) > 1
      LIMIT 1
    `).get();

    if (duplicatePhones) {
      const error = new Error("Existem telefones duplicados. Corrija os cadastros antes de habilitar comprovantes via WhatsApp.");
      error.code = "USER_PHONE_DUPLICATE";
      throw error;
    }

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_e164_unique
      ON users(phone_e164)
      WHERE phone_e164 IS NOT NULL AND phone_e164 <> '';

      CREATE TABLE IF NOT EXISTS receipt_imports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'WAHA',
        provider_event_id TEXT,
        provider_message_id TEXT NOT NULL,
        webhook_request_id TEXT,
        provider_media_url TEXT NOT NULL,
        source_chat_id TEXT NOT NULL,
        sender_phone_e164 TEXT NOT NULL,
        message_timestamp TEXT,
        status TEXT NOT NULL DEFAULT 'RECEIVED',
        storage_key TEXT,
        media_mime_type TEXT,
        media_size_bytes INTEGER,
        media_sha256 TEXT,
        original_filename TEXT,
        document_type TEXT,
        merchant_name TEXT,
        payment_date TEXT,
        amount_cents INTEGER,
        currency TEXT,
        payment_method TEXT,
        transaction_reference TEXT,
        extracted_description TEXT,
        suggested_category_name TEXT,
        suggested_category_id TEXT,
        suggested_financial_account_id TEXT,
        confidence_json TEXT,
        warnings_json TEXT,
        extracted_json TEXT,
        openai_response_id TEXT,
        openai_model TEXT,
        duplicate_of_id TEXT,
        financial_entry_id TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT,
        processing_started_at TEXT,
        processed_at TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        last_error_code TEXT,
        last_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (suggested_category_id) REFERENCES categories(id),
        FOREIGN KEY (suggested_financial_account_id) REFERENCES financial_accounts(id),
        FOREIGN KEY (duplicate_of_id) REFERENCES receipt_imports(id),
        FOREIGN KEY (financial_entry_id) REFERENCES financial_entries(id),
        UNIQUE (provider, provider_message_id),
        CHECK (status IN ('RECEIVED', 'PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'FAILED')),
        CHECK (amount_cents IS NULL OR amount_cents > 0),
        CHECK (payment_date IS NULL OR payment_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        CHECK (media_size_bytes IS NULL OR media_size_bytes >= 0),
        CHECK (attempt_count >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_receipt_imports_user_status_created
      ON receipt_imports(user_id, status, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_receipt_imports_processing_queue
      ON receipt_imports(status, next_attempt_at, created_at, processing_started_at);

      CREATE INDEX IF NOT EXISTS idx_receipt_imports_user_media_hash
      ON receipt_imports(user_id, media_sha256)
      WHERE media_sha256 IS NOT NULL;
    `);
  },
};
