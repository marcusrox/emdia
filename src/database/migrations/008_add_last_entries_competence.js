module.exports = {
  id: "008_add_last_entries_competence",
  description: "Adiciona a última competência selecionada na tela de lançamentos.",
  up(db) {
    const columns = db.prepare("PRAGMA table_info(users)").all();
    if (columns.some((column) => column.name === "last_entries_competence")) return;

    db.exec("ALTER TABLE users ADD COLUMN last_entries_competence TEXT");
  },
};
