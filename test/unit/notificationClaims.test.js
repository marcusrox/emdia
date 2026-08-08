process.env.NODE_ENV = "test";
process.env.EMDIA_DB_PATH = ":memory:";

const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { runMigrations } = require("../../src/database/migrator");
const Notification = require("../../src/models/Notification");
const { notificationQueueView } = require("../../src/views/notificationQueueView");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");

const databases = [];
const directories = [];

beforeEach(resetDatabase);
afterEach(() => {
  while (databases.length) databases.pop().close();
  while (directories.length) fs.rmSync(directories.pop(), { recursive: true, force: true });
});

describe("reivindicação da outbox", () => {
  it("impede duas conexões de reivindicar a mesma notificação", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "emdia-outbox-"));
    directories.push(directory);
    const databasePath = path.join(directory, "outbox.sqlite");
    const first = track(new DatabaseSync(databasePath));
    runMigrations({ db: first });
    const second = track(new DatabaseSync(databasePath));
    second.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 100;");
    insertQueueFixture(first);
    const now = new Date("2026-08-08T14:00:00.000Z");

    const firstClaim = Notification.claimPending("EMAIL", {
      db: first, now, claimToken: "claim-first", limit: 1,
    });
    const secondClaim = Notification.claimPending("EMAIL", {
      db: second, now, claimToken: "claim-second", limit: 1,
    });

    assert.equal(firstClaim.length, 1);
    assert.equal(secondClaim.length, 0);
    assert.equal(firstClaim[0].attempt_count, 1);
    assert.equal(Notification.markSent("notification-1", "provider-1", "claim-second", { db: second }), false);
    assert.equal(Notification.markSent("notification-1", "provider-1", "claim-first", { db: first }), true);
  });

  it("recupera claim expirado e encerra item que atingiu o limite", () => {
    const user = createUser({ email: "claim@example.test" });
    const notification = Notification.createPending({
      user_id: user.id,
      channel: "EMAIL",
      event_type: "ACCOUNT_CREATED",
      scheduled_at: "2026-08-08T13:00:00.000Z",
      idempotency_key: `email:${user.id}:claim-test`,
      payload: { to: user.email },
    });
    const first = Notification.claimPending("EMAIL", {
      now: new Date("2026-08-08T14:00:00.000Z"), claimToken: "claim-a", maxAttempts: 2,
    });
    assert.equal(first[0].id, notification.id);
    assert.equal(Notification.claimPending("EMAIL", {
      now: new Date("2026-08-08T14:04:00.000Z"), claimToken: "claim-b", maxAttempts: 2,
    }).length, 0);

    const recovered = Notification.claimPending("EMAIL", {
      now: new Date("2026-08-08T14:06:00.000Z"), claimToken: "claim-c", maxAttempts: 2,
    });
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].attempt_count, 2);
    assert.equal(recovered[0].claim_token, "claim-c");

    assert.equal(Notification.claimPending("EMAIL", {
      now: new Date("2026-08-08T14:12:00.000Z"), claimToken: "claim-d", maxAttempts: 2,
    }).length, 0);
    const exhausted = db.prepare("SELECT status, claim_token, claimed_at FROM notifications WHERE id = ?").get(notification.id);
    assert.equal(exhausted.status, "FAILED");
    assert.equal(exhausted.claim_token, null);
    assert.equal(exhausted.claimed_at, null);
  });

  it("representa processamento na fila administrativa sem ação de cancelamento", () => {
    const html = notificationQueueView({
      user: { id: "admin", name: "Admin", email: "admin@example.test", is_admin: true, csrfToken: "csrf" },
      users: [],
      filters: {},
      entries: [{
        id: "notification-processing",
        user_id: "user-1",
        user_name: "Usuário",
        user_email: "user@example.test",
        channel: "EMAIL",
        event_type: "ACCOUNT_CREATED",
        status: "PROCESSING",
        scheduled_at: "2026-08-08T14:00:00.000Z",
        created_at: "2026-08-08T13:00:00.000Z",
        attempt_count: 1,
        payload_json: "{}",
      }],
    });

    assert.match(html, /Processando/);
    assert.match(html, /queue-status-processing/);
    assert.doesNotMatch(html, /notification-processing\/cancel/);
  });
});

function insertQueueFixture(database) {
  const now = "2026-08-08T13:00:00.000Z";
  database.prepare(`INSERT INTO users
    (id, name, email, password_hash, timezone, locale, is_active, created_at, updated_at)
    VALUES ('user-1', 'Usuário', 'user@example.test', 'hash', 'America/Sao_Paulo', 'pt-BR', 1, ?, ?)`)
    .run(now, now);
  database.prepare(`INSERT INTO notifications
    (id, user_id, channel, event_type, scheduled_at, status, idempotency_key, payload_json, created_at, updated_at)
    VALUES ('notification-1', 'user-1', 'EMAIL', 'ACCOUNT_CREATED', ?, 'PENDING', 'email:user-1:test', '{}', ?, ?)`)
    .run(now, now, now);
}

function track(database) {
  databases.push(database);
  return database;
}
