module.exports = {
  id: "002_add_user_interface_preferences",
  description: "Adiciona preferências visuais do usuário",
  up(db) {
    ensureColumn(db, "users", "font_scale", "TEXT NOT NULL DEFAULT 'medium'");
    ensureColumn(db, "users", "list_density", "TEXT NOT NULL DEFAULT 'standard'");
  },
};

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.some((column) => column.name === columnName)) return;

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}
