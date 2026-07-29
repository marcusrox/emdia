const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const {
  createBackup,
  listBackups,
  restoreBackup,
  verifyBackup,
} = require("../../src/services/databaseBackupService");
const { acquireDatabaseLock } = require("../../src/services/databaseLockService");

const temporaryFixtures = [];

afterEach(() => {
  while (temporaryFixtures.length) {
    const fixture = temporaryFixtures.pop();
    try {
      fixture.db.close();
    } catch {
      // A conexão já foi fechada pelo cenário.
    }
    const resolvedRoot = path.resolve(fixture.root);
    const resolvedTemp = path.resolve(os.tmpdir());
    assert.ok(resolvedRoot.startsWith(`${resolvedTemp}${path.sep}`));
    fs.rmSync(resolvedRoot, { recursive: true, force: true });
  }
});

describe("backup e restauração do SQLite", () => {
  it("cria backups únicos e verificáveis enquanto o banco usa WAL", async () => {
    const fixture = createDatabaseFixture();
    fixture.db.exec("PRAGMA journal_mode = WAL;");
    const empty = await createBackup({
      sourcePath: fixture.databasePath,
      backupDir: fixture.backupDir,
      now: new Date("2026-07-28T21:59:00.000Z"),
    });
    const emptyDatabase = new DatabaseSync(empty.path, { readOnly: true });
    assert.equal(emptyDatabase.prepare("SELECT COUNT(*) AS total FROM users").get().total, 0);
    emptyDatabase.close();

    insertUser(fixture.db, "before-backup");

    const sourceCountBefore = fixture.db.prepare("SELECT COUNT(*) AS total FROM users").get().total;
    const first = await createBackup({
      sourcePath: fixture.databasePath,
      backupDir: fixture.backupDir,
      now: new Date("2026-07-28T22:00:00.000Z"),
    });
    const second = await createBackup({
      sourcePath: fixture.databasePath,
      backupDir: fixture.backupDir,
      now: new Date("2026-07-28T22:00:00.000Z"),
    });

    assert.notEqual(first.fileName, second.fileName);
    assert.ok(fs.existsSync(first.path));
    assert.ok(fs.existsSync(first.manifestPath));
    assert.equal(first.integrityCheck, "ok");
    assert.equal(first.foreignKeyViolations, 0);
    assert.equal(first.schemaMigration, "006_add_settlement_closure");
    assert.match(first.sha256, /^[a-f0-9]{64}$/);
    assert.equal(fixture.db.prepare("SELECT COUNT(*) AS total FROM users").get().total, sourceCountBefore);

    const verified = await verifyBackup(first.path, { backupDir: fixture.backupDir });
    assert.equal(verified.manifest.sha256, verified.sha256);
    assert.equal(verified.manifest.size_bytes, verified.sizeBytes);

    const backups = listBackups({ backupDir: fixture.backupDir });
    assert.equal(backups.length, 3);
    assert.ok(backups.every((item) => item.manifest));
    fixture.db.close();
  });

  it("rejeita arquivo corrompido, manifesto divergente e caminho externo", async () => {
    const fixture = createDatabaseFixture();
    insertUser(fixture.db, "valid");
    fixture.db.close();

    const valid = await createBackup({
      sourcePath: fixture.databasePath,
      backupDir: fixture.backupDir,
    });
    const corruptPath = path.join(fixture.backupDir, "corrupt.sqlite");
    fs.writeFileSync(corruptPath, "não é sqlite", "utf8");
    await assert.rejects(
      verifyBackup(corruptPath, { backupDir: fixture.backupDir }),
      /assinatura|tamanho válido/,
    );

    const outsidePath = path.join(fixture.root, "outside.sqlite");
    fs.copyFileSync(valid.path, outsidePath);
    await assert.rejects(
      verifyBackup(outsidePath, { backupDir: fixture.backupDir }),
      /dentro do diretório configurado/,
    );

    const manifest = JSON.parse(fs.readFileSync(valid.manifestPath, "utf8"));
    manifest.sha256 = "0".repeat(64);
    fs.writeFileSync(valid.manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    await assert.rejects(
      verifyBackup(valid.path, { backupDir: fixture.backupDir }),
      /checksum/,
    );
    fs.writeFileSync(valid.manifestPath, "{manifesto inválido", "utf8");
    const listed = listBackups({ backupDir: fixture.backupDir });
    const listedValid = listed.find((item) => item.fileName === valid.fileName);
    assert.equal(listedValid.manifest, null);
    assert.match(listedValid.manifestError, /Manifesto|JSON/);
  });

  it("restaura o banco, preserva backup de segurança e exige confirmação", async () => {
    const fixture = createDatabaseFixture();
    insertUser(fixture.db, "preserved");
    const backupResult = await createBackup({
      sourcePath: fixture.databasePath,
      backupDir: fixture.backupDir,
      now: new Date("2026-07-28T22:10:00.000Z"),
    });
    insertUser(fixture.db, "created-after-backup");
    fixture.db.close();

    await assert.rejects(
      restoreBackup({
        backupPath: backupResult.path,
        targetPath: fixture.databasePath,
        backupDir: fixture.backupDir,
      }),
      { code: "EMDIA_RESTORE_CONFIRMATION_REQUIRED" },
    );

    const restored = await restoreBackup({
      backupPath: backupResult.path,
      targetPath: fixture.databasePath,
      backupDir: fixture.backupDir,
      confirmed: true,
      now: new Date("2026-07-28T22:11:00.000Z"),
    });

    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.ok(database.prepare("SELECT id FROM users WHERE id = 'preserved'").get());
    assert.equal(database.prepare("SELECT id FROM users WHERE id = 'created-after-backup'").get(), undefined);
    database.close();

    assert.match(restored.safetyBackup.fileName, /^emdia-before-restore-/);
    assert.ok(fs.existsSync(restored.safetyBackup.path));
    const safetyVerification = await verifyBackup(restored.safetyBackup.path, {
      backupDir: fixture.backupDir,
    });
    assert.equal(safetyVerification.integrityCheck, "ok");
  });

  it("bloqueia restauração com aplicação ativa e recupera original após falha", async () => {
    const fixture = createDatabaseFixture();
    insertUser(fixture.db, "backup-state");
    const backupResult = await createBackup({
      sourcePath: fixture.databasePath,
      backupDir: fixture.backupDir,
      now: new Date("2026-07-28T22:20:00.000Z"),
    });
    insertUser(fixture.db, "current-state");
    fixture.db.close();

    const activeLock = acquireDatabaseLock(fixture.databasePath, { owner: "test-application" });
    try {
      await assert.rejects(
        restoreBackup({
          backupPath: backupResult.path,
          targetPath: fixture.databasePath,
          backupDir: fixture.backupDir,
          confirmed: true,
        }),
        { code: "EMDIA_DATABASE_IN_USE" },
      );
    } finally {
      activeLock.release();
    }

    let restorationError;
    try {
      await restoreBackup({
        backupPath: backupResult.path,
        targetPath: fixture.databasePath,
        backupDir: fixture.backupDir,
        confirmed: true,
        now: new Date("2026-07-28T22:21:00.000Z"),
        hooks: {
          afterTargetMoved() {
            throw new Error("falha controlada após mover banco atual");
          },
        },
      });
    } catch (error) {
      restorationError = error;
    }

    assert.ok(restorationError);
    assert.match(restorationError.message, /falha controlada/);
    assert.ok(restorationError.recoveryBackup);
    assert.ok(fs.existsSync(restorationError.recoveryBackup));

    const database = new DatabaseSync(fixture.databasePath, { readOnly: true });
    assert.ok(database.prepare("SELECT id FROM users WHERE id = 'current-state'").get());
    database.close();
    assert.equal(fs.existsSync(`${fixture.databasePath}.emdia.lock`), false);
  });
});

function createDatabaseFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "emdia-backup-test-"));
  const dataDir = path.join(root, "data");
  const backupDir = path.join(root, "backups");
  const databasePath = path.join(dataDir, "emdia.sqlite");
  fs.mkdirSync(dataDir);
  fs.mkdirSync(backupDir);

  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE schema_migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationsDir = path.join(__dirname, "..", "..", "src", "database", "migrations");
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".js"))
    .sort()
    .map((fileName) => require(path.join(migrationsDir, fileName)));

  for (const migration of migrations) {
    migration.up(db);
    db.prepare("INSERT INTO schema_migrations (id, description, applied_at) VALUES (?, ?, ?)")
      .run(migration.id, migration.description || null, new Date().toISOString());
  }

  const fixture = { root, dataDir, backupDir, databasePath, db };
  temporaryFixtures.push(fixture);
  return fixture;
}

function insertUser(db, id) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, timezone, locale, is_active, is_admin, created_at, updated_at
    ) VALUES (?, ?, ?, 'hash', 'America/Sao_Paulo', 'pt-BR', 1, 0, ?, ?)
  `).run(id, `Usuário ${id}`, `${id}@example.test`, now, now);
}
