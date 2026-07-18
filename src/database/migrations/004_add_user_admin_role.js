module.exports = {
  id: "004_add_user_admin_role",
  description: "Adiciona papel administrativo aos usuários",
  up(db) {
    const columns = db.prepare("PRAGMA table_info(users)").all();
    if (!columns.some((column) => column.name === "is_admin")) {
      db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;");
    }

    db.exec(`
      UPDATE users SET is_admin = 1
      WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
        AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = 1);
    `);
  },
};
