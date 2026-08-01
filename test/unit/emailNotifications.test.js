const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");
const Notification = require("../../src/models/Notification");
const {
  EmailProviderError,
  MockEmailClient,
  ResendEmailClient,
} = require("../../src/services/emailClient");
const { enqueueAccountCreatedEmail, runEmailNotificationCycle } = require("../../src/services/emailNotificationService");
const { accountCreatedEmail } = require("../../src/services/emailTemplateService");

beforeEach(resetDatabase);

describe("e-mail transacional", () => {
  it("gera HTML escapado, texto puro e link de login somente para URL válida", () => {
    const message = accountCreatedEmail({ name: "<Pessoa & Cia>", appBaseUrl: "https://emdia.example/base?x=1" });
    assert.equal(message.subject, "Sua conta no EmDia foi criada");
    assert.match(message.html, /&lt;Pessoa &amp; Cia&gt;/);
    assert.doesNotMatch(message.html, /<Pessoa & Cia>/);
    assert.match(message.html, /https:\/\/emdia\.example\/login/);
    assert.match(message.text, /Olá, <Pessoa & Cia>!/);
    assert.doesNotMatch(accountCreatedEmail({ name: "Pessoa", appBaseUrl: "inválida" }).html, /Abrir o EmDia/);
  });

  it("envia ao Resend somente os campos previstos e a chave idempotente", async () => {
    let request;
    const client = new ResendEmailClient({
      apiKey: "segredo-de-teste",
      fetchImpl: async (url, options) => {
        request = { url, options };
        return { ok: true, status: 200, json: async () => ({ id: "email_provider_1" }) };
      },
    });
    const result = await client.send(messageInput());
    const body = JSON.parse(request.options.body);

    assert.equal(result.providerMessageId, "email_provider_1");
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.equal(request.options.headers.Authorization, "Bearer segredo-de-teste");
    assert.equal(request.options.headers["Idempotency-Key"], "email:usr_1:account-created");
    assert.deepEqual(Object.keys(body).sort(), ["from", "html", "subject", "text", "to"]);
  });

  it("classifica limite do provedor como falha transitória sem incorporar resposta", async () => {
    const client = new ResendEmailClient({
      apiKey: "segredo-de-teste",
      fetchImpl: async () => ({ ok: false, status: 429 }),
    });
    await assert.rejects(client.send(messageInput()), (error) => {
      assert.equal(error.code, "http_429");
      assert.equal(error.transient, true);
      assert.doesNotMatch(error.message, /segredo-de-teste/);
      return true;
    });
  });

  it("enfileira uma única conta criada e o worker mock a marca como aceita", async () => {
    const user = createUser({ email: "email@example.test", name: "Pessoa E-mail" });
    enqueueAccountCreatedEmail(user);
    enqueueAccountCreatedEmail(user);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?").get(user.id).total, 1);

    await runEmailNotificationCycle({ client: new MockEmailClient(), now: new Date("2099-08-01T18:00:00.000Z") });
    const notification = db.prepare("SELECT * FROM notifications WHERE user_id = ?").get(user.id);
    assert.equal(notification.status, "SENT");
    assert.match(notification.provider_message_id, /^mock-email-/);
    assert.ok(notification.sent_at);
  });

  it("reagenda falha transitória e envia mesmo após o usuário ser bloqueado", async () => {
    const user = createUser({ email: "bloqueado@example.test" });
    const now = new Date("2026-08-01T18:00:00.000Z");
    const notification = Notification.createPending({
      user_id: user.id,
      channel: "EMAIL",
      event_type: "ACCOUNT_CREATED",
      scheduled_at: "2026-08-01T17:59:00.000Z",
      idempotency_key: `email:${user.id}:account-created`,
      payload: { to: user.email, name: user.name, template_version: 1 },
    });
    db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(user.id);

    await runEmailNotificationCycle({
      client: { provider: "test", send: async () => { throw new EmailProviderError("http_500", { transient: true }); } },
      now,
    });
    const failed = db.prepare("SELECT * FROM notifications WHERE id = ?").get(notification.id);
    assert.equal(failed.status, "FAILED");
    assert.equal(failed.attempt_count, 1);
    assert.equal(failed.scheduled_at, "2026-08-01T18:01:00.000Z");

    await runEmailNotificationCycle({ client: new MockEmailClient(), now: new Date("2026-08-01T18:01:00.000Z") });
    assert.equal(db.prepare("SELECT status FROM notifications WHERE id = ?").get(notification.id).status, "SENT");
  });

  it("encerra retentativas automáticas para erro não transitório", async () => {
    const user = createUser({ email: "erro400@example.test" });
    enqueueAccountCreatedEmail(user);
    await runEmailNotificationCycle({
      client: { provider: "test", send: async () => { throw new EmailProviderError("http_400", { statusCode: 400 }); } },
      now: new Date("2099-08-01T18:00:00.000Z"),
      maxAttempts: 5,
    });
    const failed = db.prepare("SELECT status, attempt_count FROM notifications WHERE user_id = ?").get(user.id);
    assert.equal(failed.status, "FAILED");
    assert.equal(failed.attempt_count, 5);

    await runEmailNotificationCycle({ client: new MockEmailClient(), now: new Date("2099-08-02T18:00:00.000Z") });
    assert.equal(db.prepare("SELECT status FROM notifications WHERE user_id = ?").get(user.id).status, "FAILED");
  });
});

function messageInput() {
  return {
    to: "pessoa@example.test",
    from: "EmDia <nao-responda@idevs.com.br>",
    subject: "Sua conta no EmDia foi criada",
    html: "<p>Conta criada</p>",
    text: "Conta criada",
    idempotencyKey: "email:usr_1:account-created",
  };
}
