const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");
const { csrfFrom, login } = require("../helpers/http");
const { createServer } = require("../../src/server");
const User = require("../../src/models/User");
const Auth = require("../../src/services/authService");
const { createSignupRateLimiter } = require("../../src/services/signupRateLimitService");
const { provisionInitialUserData } = require("../../src/services/userProvisioningService");

beforeEach(resetDatabase);

describe("cadastro público", () => {
  it("apresenta benefícios no login e formulário público protegido", async () => {
    const app = createServer();
    const loginPage = await request(app).get("/login").expect(200);

    assert.match(loginPage.text, /Tenha clareza sobre o seu mês financeiro/);
    assert.match(loginPage.text, /Criar minha conta/);
    assert.match(loginPage.text, /href="\/signup"/);

    const signupPage = await request(app).get("/signup").expect(200);
    assert.match(signupPage.text, /name="name"/);
    assert.match(signupPage.text, /name="email"/);
    assert.match(signupPage.text, /name="password"/);
    assert.match(signupPage.text, /name="confirm_password"/);
    assert.ok(csrfFrom(signupPage.text));
    assert.match(String(signupPage.headers["set-cookie"]), /emdia_signup_csrf=/);
  });

  it("valida campos sem devolver senhas ao HTML", async () => {
    const agent = request.agent(createServer());
    const page = await agent.get("/signup").expect(200);
    const response = await agent.post("/signup").type("form").send({
      _csrf: csrfFrom(page.text),
      name: "Pessoa Teste",
      email: "invalido",
      password: "curta",
      confirm_password: "diferente",
      timezone: "Fuso/Inexistente",
    }).expect(422);

    assert.match(response.text, /Informe um e-mail válido/);
    assert.match(response.text, /12 caracteres/);
    assert.match(response.text, /confirmação da senha não confere/);
    assert.doesNotMatch(response.text, /value="curta"|value="diferente"/);
    assert.match(response.text, /value="Pessoa Teste"/);
  });

  it("cria usuário comum, sessão e dados iniciais isolados", async () => {
    const other = createUser({ email: "outro@example.test" });
    db.prepare(`INSERT INTO financial_accounts
      (id,user_id,name,type,initial_balance_cents,is_active,created_at,updated_at)
      VALUES ('acc_other',?,'Conta privada','CHECKING',9900,1,?,?)`)
      .run(other.id, new Date().toISOString(), new Date().toISOString());

    const agent = request.agent(createServer());
    const page = await agent.get("/signup").expect(200);
    const response = await agent.post("/signup").type("form").send({
      _csrf: csrfFrom(page.text),
      name: "Nova Pessoa",
      email: " NOVA@Example.Test ",
      password: "frase senha segura",
      confirm_password: "frase senha segura",
      timezone: "America/Manaus",
      is_admin: "1",
      is_active: "0",
      role: "admin",
      id: "usr_injetado",
      password_hash: "texto-claro",
    }).expect(303);

    assert.equal(response.headers.location, "/dashboard");
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get("nova@example.test");
    assert.ok(user);
    assert.notEqual(user.id, "usr_injetado");
    assert.equal(user.is_admin, 0);
    assert.equal(user.is_active, 1);
    assert.equal(user.timezone, "America/Manaus");
    assert.equal(Auth.verifyPassword("frase senha segura", user.password_hash), true);

    const accounts = db.prepare(`
      SELECT name, type, initial_balance_cents, initial_balance_date, institution_name
      FROM financial_accounts WHERE user_id = ? ORDER BY name
    `).all(user.id);
    assert.deepEqual(accounts.map((account) => account.name), ["Carteira", "Conta corrente"]);
    assert.deepEqual(accounts.map((account) => account.initial_balance_cents), [0, 0]);
    assert.ok(accounts.every((account) => account.initial_balance_date === "2026-08-01"));
    assert.ok(accounts.every((account) => account.institution_name === null));

    const categories = db.prepare(`
      SELECT name, entry_type, color FROM categories WHERE user_id = ? ORDER BY name
    `).all(user.id);
    assert.equal(categories.length, 7);
    assert.ok(categories.some((category) => category.name === "Salário" && category.entry_type === "INCOME"));
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_entries WHERE user_id = ?").get(user.id).total, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_accounts WHERE user_id = ? AND name = 'Conta privada'").get(user.id).total, 0);

    const notification = db.prepare("SELECT * FROM notifications WHERE user_id = ?").get(user.id);
    assert.ok(notification);
    assert.equal(notification.channel, "EMAIL");
    assert.equal(notification.event_type, "ACCOUNT_CREATED");
    assert.equal(notification.status, "PENDING");
    assert.equal(notification.idempotency_key, `email:${user.id}:account-created`);
    assert.doesNotMatch(notification.payload_json, /frase senha segura|password_hash|csrf/i);

    const dashboard = await agent.get("/dashboard").expect(200);
    assert.match(dashboard.text, /2026-08/);
  });

  it("recusa e-mail duplicado sem diferenciar maiúsculas de minúsculas", async () => {
    createUser({ email: "duplicado@example.test" });
    const agent = request.agent(createServer());
    const page = await agent.get("/signup").expect(200);
    const response = await agent.post("/signup").type("form").send(validSignup({
      _csrf: csrfFrom(page.text),
      email: "DUPLICADO@EXAMPLE.TEST",
    })).expect(409);

    assert.match(response.text, /Este e-mail já está cadastrado/);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM users WHERE lower(email) = lower(?)").get("duplicado@example.test").total, 1);
  });

  it("bloqueia CSRF inválido e excesso de tentativas", async () => {
    const signupRateLimiter = createSignupRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    const app = createServer({ signupRateLimiter });
    const agent = request.agent(app);

    await agent.post("/signup").type("form").send(validSignup({ _csrf: "invalido" })).expect(403);
    const page = await agent.get("/signup").expect(200);
    const blocked = await agent.post("/signup").type("form").send(validSignup({
      _csrf: csrfFrom(page.text),
      email: "segunda@example.test",
    })).expect(429);

    assert.match(blocked.text, /Muitas tentativas de cadastro/);
    assert.ok(Number(blocked.headers["retry-after"]) > 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM users WHERE email LIKE '%@example.test'").get().total, 0);
  });

  it("reverte usuário e dados iniciais quando o provisionamento falha", () => {
    assert.throws(() => User.registerPublic(validSignup(), {
      provisioner() {
        throw new Error("falha controlada no provisionamento");
      },
    }), /falha controlada/);

    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM users WHERE email = ?").get("nova@example.test").total, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_accounts").get().total, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM categories").get().total, 0);
  });

  it("reverte todo o cadastro quando a notificação local não pode ser enfileirada", () => {
    assert.throws(() => User.registerPublic(validSignup(), {
      notificationEnqueuer() {
        throw new Error("falha controlada na fila");
      },
    }), /falha controlada/);

    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM users WHERE email = ?").get("nova@example.test").total, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_accounts").get().total, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM categories").get().total, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM notifications").get().total, 0);
  });

  it("não duplica o provisionamento inicial para o mesmo usuário", () => {
    const user = createUser({ email: "idempotente@example.test" });
    provisionInitialUserData(user);
    provisionInitialUserData(user);

    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_accounts WHERE user_id = ?").get(user.id).total, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM categories WHERE user_id = ?").get(user.id).total, 7);
  });

  it("não permite cadastro adicional durante uma sessão autenticada", async () => {
    createUser({ email: "autenticado@example.test", password: "senha autenticada" });
    const agent = request.agent(createServer());
    const loginResponse = await login(agent, { email: "autenticado@example.test", password: "senha autenticada" });
    assert.equal(loginResponse.status, 303);
    const before = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;

    const getResponse = await agent.get("/signup").expect(303);
    assert.equal(getResponse.headers.location, "/dashboard");
    const postResponse = await agent.post("/signup").type("form").send(validSignup()).expect(303);
    assert.equal(postResponse.headers.location, "/dashboard");
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM users").get().total, before);
  });
});

function validSignup(overrides = {}) {
  return {
    name: "Nova Pessoa",
    email: "nova@example.test",
    password: "frase senha segura",
    confirm_password: "frase senha segura",
    timezone: "America/Sao_Paulo",
    ...overrides,
  };
}
