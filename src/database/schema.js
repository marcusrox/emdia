const { runMigrations } = require("./migrator");

function initializeDatabase() {
  runMigrations();
}

module.exports = {
  initializeDatabase,
};
