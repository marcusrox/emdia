module.exports = {
  id: "009_generalize_last_competence",
  description: "Generaliza a última competência selecionada entre telas mensais.",
  up(db) {
    const columns = db.prepare("PRAGMA table_info(users)").all();
    const hasLastCompetence = columns.some((column) => column.name === "last_competence");
    const hasEntriesPreference = columns.some((column) => column.name === "last_entries_competence");

    if (!hasLastCompetence) {
      db.exec("ALTER TABLE users ADD COLUMN last_competence TEXT");
    }

    if (hasEntriesPreference) {
      db.exec(`
        UPDATE users
        SET last_competence = last_entries_competence
        WHERE last_competence IS NULL
          AND last_entries_competence IS NOT NULL
      `);
    }
  },
};
