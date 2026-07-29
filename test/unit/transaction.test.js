process.env.NODE_ENV = "test";
process.env.EMDIA_DB_PATH = ":memory:";

const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { BUSY_TIMEOUT_MS, getDatabase } = require("../../src/database/connection");
const {
  withImmediateTransaction,
  withTransaction,
} = require("../../src/database/transaction");

const databases = [];
const temporaryDirectories = [];

afterEach(() => {
  while (databases.length) {
    const database = databases.pop();
    try {
      database.close();
    } catch {
      // O teste pode fechar a conexão para simular falha de rollback.
    }
  }

  while (temporaryDirectories.length) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe("helper transacional SQLite", () => {
  it("retorna o valor do callback e efetua exatamente um commit", () => {
    const commands = [];
    const fakeDatabase = {
      isTransaction: false,
      exec(command) {
        commands.push(command);
        this.isTransaction = command.startsWith("BEGIN");
        if (command === "COMMIT" || command === "ROLLBACK") this.isTransaction = false;
      },
    };

    const result = withTransaction(fakeDatabase, () => ({ ok: true }));

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(commands, ["BEGIN", "COMMIT"]);
  });

  it("persiste retorno funcional antecipado sem deixar transação aberta", () => {
    const database = createMemoryDatabase();
    database.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");

    const result = withTransaction(database, (db) => {
      db.prepare("INSERT INTO items (name) VALUES (?)").run("persistido");
      return { ok: false, reason: "resultado-funcional" };
    });

    assert.deepEqual(result, { ok: false, reason: "resultado-funcional" });
    assert.equal(database.isTransaction, false);
    assert.equal(database.prepare("SELECT COUNT(*) AS total FROM items").get().total, 1);
  });

  it("reverte múltiplas gravações e relança o mesmo erro original", () => {
    const database = createMemoryDatabase();
    database.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
    const originalError = new Error("falha intermediária");

    assert.throws(
      () => withTransaction(database, (db) => {
        db.prepare("INSERT INTO items (name) VALUES (?)").run("primeiro");
        db.prepare("INSERT INTO items (name) VALUES (?)").run("segundo");
        throw originalError;
      }),
      (error) => error === originalError
    );

    assert.equal(database.isTransaction, false);
    assert.equal(database.prepare("SELECT COUNT(*) AS total FROM items").get().total, 0);
  });

  it("faz rollback quando o callback falha antes da primeira gravação", () => {
    const database = createMemoryDatabase();

    assert.throws(
      () => withTransaction(database, () => {
        throw new Error("falha antes da escrita");
      }),
      /falha antes da escrita/
    );
    assert.equal(database.isTransaction, false);
  });

  it("rejeita transação aninhada iniciada pelo helper ou manualmente", () => {
    const database = createMemoryDatabase();

    withTransaction(database, () => {
      assert.throws(
        () => withImmediateTransaction(database, () => null),
        (error) => error.code === "SQLITE_NESTED_TRANSACTION"
      );
    });

    database.exec("BEGIN");
    assert.throws(
      () => withTransaction(database, () => null),
      (error) => error.code === "SQLITE_NESTED_TRANSACTION"
    );
    database.exec("ROLLBACK");
  });

  it("preserva a causa original quando o rollback também falha", () => {
    const originalError = new Error("causa original");
    const rollbackError = new Error("rollback indisponível");
    const fakeDatabase = {
      isTransaction: false,
      exec(command) {
        if (command === "BEGIN") {
          this.isTransaction = true;
          return;
        }
        if (command === "ROLLBACK") throw rollbackError;
      },
    };

    assert.throws(
      () => withTransaction(fakeDatabase, () => {
        throw originalError;
      }),
      (error) => error === originalError
    );
    assert.equal(originalError.rollbackError, rollbackError);
  });

  it("rejeita callback assíncrono e encerra a transação com rollback", () => {
    const database = createMemoryDatabase();

    assert.throws(
      () => withTransaction(database, () => Promise.resolve("não suportado")),
      /callback transacional deve ser síncrono/
    );
    assert.equal(database.isTransaction, false);
  });

  it("mantém lock IMMEDIATE entre conexões sem retry implícito", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "emdia-transaction-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "concurrency.sqlite");
    const first = trackDatabase(new DatabaseSync(databasePath));
    const second = trackDatabase(new DatabaseSync(databasePath));
    first.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
    second.exec("PRAGMA busy_timeout = 10");

    withImmediateTransaction(first, (db) => {
      db.prepare("INSERT INTO items (name) VALUES (?)").run("primeiro");
      assert.throws(
        () => withImmediateTransaction(second, () => null),
        /database is locked/
      );
    });

    withImmediateTransaction(second, (db) => {
      db.prepare("INSERT INTO items (name) VALUES (?)").run("segundo");
    });
    assert.equal(first.prepare("SELECT COUNT(*) AS total FROM items").get().total, 2);
  });

  it("aplica busy_timeout conservador à conexão do projeto", () => {
    const row = getDatabase().prepare("PRAGMA busy_timeout").get();
    assert.equal(Number(Object.values(row)[0]), BUSY_TIMEOUT_MS);
    assert.equal(BUSY_TIMEOUT_MS, 5000);
  });
});

function createMemoryDatabase() {
  return trackDatabase(new DatabaseSync(":memory:"));
}

function trackDatabase(database) {
  databases.push(database);
  return database;
}
