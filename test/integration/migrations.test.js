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
    assert.ok(columnExists(database, "users", "phone_whatsapp_legacy"));
    assert.ok(columnExists(database, "notification_preferences", "receipt_queue_failure_enabled"));
    assert.ok(columnExists(database, "notification_preferences", "receipt_processing_failure_enabled"));
    assert.ok(columnExists(database, "notification_preferences", "receipt_ready_review_enabled"));
    assert.ok(columnExists(database, "notification_preferences", "receipt_approved_enabled"));
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

  it("gera o telefone legado e protege representações equivalentes entre usuários", () => {
    const database = createDatabase();
    const migrations = loadProjectMigrations();
    const aliasIndex = migrations.findIndex((migration) => migration.id === "012_add_legacy_whatsapp_phone");
    const beforeAlias = migrations.slice(0, aliasIndex);
    const now = new Date().toISOString();

    runMigrations({ db: database, migrations: beforeAlias });
    database.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone_e164, timezone, locale, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "migration-phone-user",
      "Usuário telefone",
      "phone@example.test",
      "hash",
      "+5571992769969",
      "America/Sao_Paulo",
      "pt-BR",
      now,
      now
    );

    runMigrations({ db: database, migrations });

    assert.equal(
      database.prepare("SELECT phone_whatsapp_legacy FROM users WHERE id = ?").get("migration-phone-user").phone_whatsapp_legacy,
      "+557192769969"
    );
    assert.throws(() => {
      database.prepare(`
        INSERT INTO users (id, name, email, password_hash, phone_e164, timezone, locale, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "migration-conflicting-user",
        "Usuário conflitante",
        "conflict@example.test",
        "hash",
        "+557192769969",
        "America/Sao_Paulo",
        "pt-BR",
        now,
        now
      );
    }, /USER_PHONE_ALIAS_CONFLICT/);
  });

  it("preserva o canal geral e habilita os eventos de comprovantes na migration", () => {
    const database = createDatabase();
    const migrations = loadProjectMigrations();
    const preferencesIndex = migrations.findIndex((migration) => migration.id === "013_add_receipt_notification_preferences");
    const beforePreferences = migrations.slice(0, preferencesIndex);
    const now = new Date().toISOString();

    runMigrations({ db: database, migrations: beforePreferences });
    for (const [id, enabled] of [["enabled", 1], ["disabled", 0]]) {
      database.prepare(`
        INSERT INTO users (id, name, email, password_hash, timezone, locale, created_at, updated_at)
        VALUES (?, ?, ?, 'hash', 'America/Sao_Paulo', 'pt-BR', ?, ?)
      `).run(`user-${id}`, `Usuário ${id}`, `${id}@example.test`, now, now);
      database.prepare(`
        INSERT INTO notification_preferences (
          id, user_id, whatsapp_enabled, daily_summary_enabled, daily_summary_time,
          due_reminder_offsets_json, overdue_reminder_interval_days, created_at, updated_at
        ) VALUES (?, ?, ?, 1, '08:00', '[5,2,0]', 3, ?, ?)
      `).run(`preference-${id}`, `user-${id}`, enabled, now, now);
    }

    runMigrations({ db: database, migrations });
    const preferences = database.prepare(`
      SELECT whatsapp_enabled, receipt_queue_failure_enabled,
        receipt_processing_failure_enabled, receipt_ready_review_enabled,
        receipt_approved_enabled
      FROM notification_preferences ORDER BY user_id
    `).all();
    assert.deepEqual(preferences.map((item) => item.whatsapp_enabled), [0, 1]);
    for (const item of preferences) {
      assert.equal(item.receipt_queue_failure_enabled, 1);
      assert.equal(item.receipt_processing_failure_enabled, 1);
      assert.equal(item.receipt_ready_review_enabled, 1);
      assert.equal(item.receipt_approved_enabled, 1);
    }
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
