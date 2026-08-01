process.env.NODE_ENV = "test";
process.env.EMDIA_DB_PATH = ":memory:";

const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { runMigrations } = require("../../src/database/migrator");

const databases = [];
const migrationsDirectory = path.join(__dirname, "..", "..", "src", "database", "migrations");

afterEach(() => {
  while (databases.length) databases.pop().close();
});

describe("migrations", () => {
  it("aplica todas em banco vazio e repete sem efeitos duplicados", () => {
    const database = createDatabase();
    const migrations = loadProjectMigrations();

    runMigrations({ db: database, migrations });
    runMigrations({ db: database, migrations });

    assert.equal(
      database.prepare("SELECT COUNT(*) AS total FROM schema_migrations").get().total,
      migrations.length
    );
    assert.ok(tableExists(database, "financial_entries"));
    assert.ok(columnExists(database, "settlements", "closes_entry"));
    assert.ok(columnExists(database, "users", "last_entries_competence"));
    assert.ok(columnExists(database, "users", "last_competence"));
    assert.equal(database.isTransaction, false);
  });

  it("atualiza banco que representa uma versão anterior", () => {
    const database = createDatabase();
    const migrations = loadProjectMigrations();
    const previousVersion = migrations.slice(0, 3);

    runMigrations({ db: database, migrations: previousVersion });
    assert.equal(columnExists(database, "users", "is_admin"), false);
    assert.equal(tableExists(database, "settlement_reversals"), false);

    runMigrations({ db: database, migrations });
    assert.equal(columnExists(database, "users", "is_admin"), true);
    assert.equal(tableExists(database, "settlement_reversals"), true);
    assert.equal(columnExists(database, "settlements", "closes_entry"), true);
    assert.equal(columnExists(database, "users", "last_entries_competence"), true);
    assert.equal(columnExists(database, "users", "last_competence"), true);
  });

  it("preserva a preferência criada antes da generalização", () => {
    const database = createDatabase();
    const migrations = loadProjectMigrations();
    const generalizationIndex = migrations.findIndex((migration) => migration.id === "009_generalize_last_competence");
    const beforeGeneralization = migrations.slice(0, generalizationIndex);

    runMigrations({ db: database, migrations: beforeGeneralization });
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, timezone, locale, is_active,
        created_at, updated_at, last_entries_competence
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      "migration-user",
      "Usuário migration",
      "migration@example.test",
      "hash",
      "America/Sao_Paulo",
      "pt-BR",
      now,
      now,
      "2025-12"
    );

    runMigrations({ db: database, migrations });

    assert.equal(
      database.prepare("SELECT last_competence FROM users WHERE id = ?").get("migration-user").last_competence,
      "2025-12"
    );
  });

  it("rejeita IDs duplicados e migrations inválidas antes de aplicar", () => {
    const database = createDatabase();
    const duplicate = { id: "duplicate", up(db) { db.exec("CREATE TABLE duplicate_one (id INTEGER)"); } };

    assert.throws(
      () => runMigrations({ db: database, migrations: [duplicate, { ...duplicate }] }),
      /Migration duplicada/
    );
    assert.equal(tableExists(database, "duplicate_one"), false);
    assert.throws(
      () => runMigrations({ db: database, migrations: [{ id: "invalid" }] }),
      /não possui função up/
    );
    assert.equal(tableExists(database, "schema_migrations"), false);
  });

  it("reverte integralmente a migration que falha", () => {
    const database = createDatabase();
    const failure = new Error("falha controlada da migration");
    const migrations = [
      {
        id: "test_001_stable",
        description: "Cria estrutura estável",
        up(db) {
          db.exec("CREATE TABLE stable_items (id INTEGER PRIMARY KEY)");
          db.prepare("INSERT INTO stable_items (id) VALUES (?)").run(1);
        },
      },
      {
        id: "test_002_failure",
        description: "Falha após múltiplas alterações",
        up(db) {
          db.exec("CREATE TABLE failed_items (id INTEGER PRIMARY KEY)");
          db.prepare("INSERT INTO failed_items (id) VALUES (?)").run(1);
          throw failure;
        },
      },
    ];

    assert.throws(
      () => runMigrations({ db: database, migrations }),
      (error) => error === failure
    );
    assert.equal(database.prepare("SELECT COUNT(*) AS total FROM stable_items").get().total, 1);
    assert.equal(tableExists(database, "failed_items"), false);
    assert.deepEqual(
      database.prepare("SELECT id FROM schema_migrations ORDER BY id").all().map((row) => row.id),
      ["test_001_stable"]
    );
    assert.equal(database.isTransaction, false);
  });
});

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  databases.push(database);
  return database;
}

function loadProjectMigrations() {
  return fs
    .readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith(".js"))
    .sort()
    .map((filename) => require(path.join(migrationsDirectory, filename)));
}

function tableExists(database, table) {
  return Boolean(
    database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
  );
}

function columnExists(database, table, column) {
  return database.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column);
}
