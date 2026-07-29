const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { logInfo } = require("../services/operationalLogger");

const dataDir = path.join(__dirname, "..", "..", "data");
const dbPath = process.env.EMDIA_DB_PATH || path.join(dataDir, "emdia.sqlite");
const BUSY_TIMEOUT_MS = 5000;

let database;

function getDatabase() {
  if (!database) {
    fs.mkdirSync(dataDir, { recursive: true });
    database = new DatabaseSync(dbPath);
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec("PRAGMA journal_mode = WAL;");
    database.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
    logInfo("app.startup.database_connected", "Banco de dados conectado.", {
      details: {
        database: "sqlite",
        path: dbPath,
      },
    });
  }

  return database;
}

module.exports = {
  BUSY_TIMEOUT_MS,
  getDatabase,
  dbPath,
};
