const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "..", "..", "data");
const dbPath = process.env.EMDIA_DB_PATH || path.join(dataDir, "emdia.sqlite");

let database;

function getDatabase() {
  if (!database) {
    fs.mkdirSync(dataDir, { recursive: true });
    database = new DatabaseSync(dbPath);
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec("PRAGMA journal_mode = WAL;");
  }

  return database;
}

module.exports = {
  getDatabase,
  dbPath,
};
