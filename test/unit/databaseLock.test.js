const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { afterEach, describe, it } = require("node:test");

const {
  INVALID_LOCK_GRACE_MS,
  acquireDatabaseLock,
  readDatabaseLock,
} = require("../../src/services/databaseLockService");

const temporaryRoots = [];

afterEach(() => {
  while (temporaryRoots.length) {
    const root = path.resolve(temporaryRoots.pop());
    assert.ok(root.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("lock operacional do banco", () => {
  it("mantém bloqueio conservador para arquivo inválido recém-criado", () => {
    const databasePath = createDatabasePath();
    fs.writeFileSync(`${databasePath}.emdia.lock`, "", "utf8");

    assert.throws(
      () => acquireDatabaseLock(databasePath),
      { code: "EMDIA_DATABASE_IN_USE" },
    );
  });

  it("recupera automaticamente arquivo inválido e antigo", () => {
    const databasePath = createDatabasePath();
    const lockPath = `${databasePath}.emdia.lock`;
    fs.writeFileSync(lockPath, "", "utf8");
    const staleDate = new Date(Date.now() - INVALID_LOCK_GRACE_MS - 1000);
    fs.utimesSync(lockPath, staleDate, staleDate);

    const acquired = acquireDatabaseLock(databasePath, { owner: "test-application" });
    const lock = readDatabaseLock(lockPath);

    assert.equal(lock.owner, "test-application");
    assert.equal(lock.pid, process.pid);
    acquired.release();
    assert.equal(fs.existsSync(lockPath), false);
  });
});

function createDatabasePath() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "emdia-lock-test-"));
  temporaryRoots.push(root);
  return path.join(root, "emdia.sqlite");
}
