const fs = require("node:fs");
const path = require("node:path");
const { getDatabase } = require("./connection");
const { withTransaction } = require("./transaction");
const { logError, logInfo } = require("../services/operationalLogger");

const migrationsDir = path.join(__dirname, "migrations");

function runMigrations(options = {}) {
  const db = options.db || getDatabase();
  const migrations = options.migrations || loadMigrations();
  validateMigrationPlan(migrations);
  ensureMigrationsTable(db);

  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations ORDER BY id").all().map((migration) => migration.id),
  );

  migrations.forEach((migration) => {
    if (applied.has(migration.id)) return;
    applyMigration(db, migration);
  });
}

function validateMigrationPlan(migrations) {
  const ids = new Set();

  migrations.forEach((migration, index) => {
    validateMigration(`posição ${index + 1}`, migration);
    if (ids.has(migration.id)) {
      throw new Error(`Migration duplicada: ${migration.id}.`);
    }
    ids.add(migration.id);
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
    withTransaction(db, () => {
      migration.up(db);
      db.prepare("INSERT INTO schema_migrations (id, description, applied_at) VALUES (?, ?, ?)").run(
        migration.id,
        migration.description || null,
        new Date().toISOString(),
      );
    });
  } catch (error) {
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
