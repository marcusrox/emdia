const fs = require("node:fs");
const path = require("node:path");
const { getDatabase } = require("./connection");
const { logError, logInfo } = require("../services/operationalLogger");

const migrationsDir = path.join(__dirname, "migrations");

function runMigrations() {
  const db = getDatabase();
  ensureMigrationsTable(db);

  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations ORDER BY id").all().map((migration) => migration.id),
  );
  const migrations = loadMigrations();

  migrations.forEach((migration) => {
    if (applied.has(migration.id)) return;
    applyMigration(db, migration);
  });
}

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      applied_at TEXT NOT NULL
    );
  `);
}

function loadMigrations() {
  return fs
    .readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith(".js"))
    .sort()
    .map((filename) => {
      const migration = require(path.join(migrationsDir, filename));
      validateMigration(filename, migration);
      return migration;
    });
}

function validateMigration(filename, migration) {
  if (!migration || typeof migration !== "object") {
    throw new Error(`Migration inválida em ${filename}.`);
  }

  if (!migration.id || typeof migration.id !== "string") {
    throw new Error(`Migration ${filename} não possui id válido.`);
  }

  if (typeof migration.up !== "function") {
    throw new Error(`Migration ${migration.id} não possui função up.`);
  }
}

function applyMigration(db, migration) {
  logInfo("database.migration.begin", "Aplicando migration de banco.", {
    details: {
      migration: migration.id,
      description: migration.description || null,
    },
  });

  try {
    db.exec("BEGIN;");
    migration.up(db);
    db.prepare("INSERT INTO schema_migrations (id, description, applied_at) VALUES (?, ?, ?)").run(
      migration.id,
      migration.description || null,
      new Date().toISOString(),
    );
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    logError("database.migration.failed", "Falha ao aplicar migration de banco.", {
      details: {
        migration: migration.id,
        message: error.message,
      },
    });
    throw error;
  }

  logInfo("database.migration.completed", "Migration de banco aplicada.", {
    details: {
      migration: migration.id,
    },
  });
}

module.exports = {
  runMigrations,
};
