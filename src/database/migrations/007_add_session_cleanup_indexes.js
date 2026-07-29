module.exports = {
  id: "007_add_session_cleanup_indexes",
  description: "Adiciona índices para limpeza periódica de sessões expiradas e revogadas.",
  up(db) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions(revoked_at)
        WHERE revoked_at IS NOT NULL;
    `);
  },
};
