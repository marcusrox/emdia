const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");
const { requestWithSession } = require("../helpers/http");
const { createServer } = require("../../src/server");
const Auth = require("../../src/services/authService");
const { createLoginRateLimiter } = require("../../src/services/loginRateLimitService");
const User = require("../../src/models/User");

beforeEach(resetDatabase);

describe("autenticação e sessões", () => {
  it("mantém mensagem genérica para e-mail inexistente e senha incorreta", async () => {
    const user = createUser({ email: "existente@example.test", password: "senha-correta" });
    const app = createServer();

    const missing = await request(app)
      .post("/login")
      .type("form")
      .send({ email: "ausente@example.test", password: "qualquer" })
      .expect(401);
    const wrongPassword = await request(app)
      .post("/login")
      .type("form")
      .send({ email: user.email, password: "senha-incorreta" })
      .expect(401);

    assert.match(missing.text, /E-mail ou senha inválidos/);
    assert.match(wrongPassword.text, /E-mail ou senha inválidos/);
    assert.doesNotMatch(missing.text, /não encontrado|inexistente/i);
    assert.doesNotMatch(wrongPassword.text, /senha incorreta/i);
  });

  it("limita tentativas por IP confiável e e-mail normalizado sem espera real", async () => {
    let now = 1_000;
    const loginRateLimiter = createLoginRateLimiter({
      maxAttempts: 2,
      windowMs: 10_000,
      now: () => now,
    });
    const user = createUser({ email: "limite@example.test", password: "senha-legada" });
    const app = createServer({ loginRateLimiter });

    await request(app).post("/login").set("X-Forwarded-For", "198.51.100.10")
      .type("form").send({ email: " LIMITE@example.test ", password: "errada" }).expect(401);
    const blocked = await request(app).post("/login").set("X-Forwarded-For", "198.51.100.10")
      .type("form").send({ email: user.email, password: "errada" }).expect(429);
    assert.match(blocked.text, /Muitas tentativas/);
    assert.ok(Number(blocked.headers["retry-after"]) > 0);

    await request(app).post("/login").set("X-Forwarded-For", "198.51.100.11")
      .type("form").send({ email: user.email, password: "senha-legada" }).expect(303);
    await request(app).post("/login").set("X-Forwarded-For", "198.51.100.10")
      .type("form").send({ email: "outro@example.test", password: "errada" }).expect(401);

    now += 10_001;
    await request(app).post("/login").set("X-Forwarded-For", "198.51.100.10")
      .type("form").send({ email: user.email, password: "senha-legada" }).expect(303);
  });

  it("aplica política nova sem invalidar hash legado e revoga sessões ao trocar senha", () => {
    const user = createUser({ password: "curta" });
    const legacySession = Auth.createSession(user.id);
    assert.equal(Auth.verifyPassword("curta", user.password_hash), true);

    const rejected = UserUpdate(user, {
      current_password: "curta",
      new_password: "muito-curta",
      confirm_password: "muito-curta",
    });
    assert.equal(rejected.ok, false);
    assert.match(rejected.errors.join(" "), /12 caracteres/);

    const updated = UserUpdate(user, {
      current_password: "curta",
      new_password: "frase senha segura",
      confirm_password: "frase senha segura",
    });
    assert.equal(updated.ok, true);
    assert.equal(Boolean(Auth.getSession(requestWithSession(legacySession.token))), false);
  });

  it("remove sessões expiradas e revogadas antigas em lote limitado", () => {
    const user = createUser();
    Auth.createSession(user.id);
    Auth.createSession(user.id);
    Auth.createSession(user.id);
    db.prepare("UPDATE sessions SET expires_at = ?").run("2000-01-01T00:00:00.000Z");

    const first = Auth.cleanupSessions({ now: new Date("2026-01-01T00:00:00.000Z"), limit: 2 });
    assert.equal(first.deleted, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM sessions").get().total, 1);
    const second = Auth.cleanupSessions({ now: new Date("2026-01-01T00:00:00.000Z"), limit: 2 });
    assert.equal(second.deleted, 1);
  });

  it("rejeita sessões expiradas e revogadas", () => {
    const user = createUser();
    const expired = Auth.createSession(user.id);
    const expiredRequest = requestWithSession(expired.token);
    assert.ok(Auth.getSession(expiredRequest));

    db.prepare("UPDATE sessions SET expires_at = ? WHERE user_id = ?")
      .run("2000-01-01T00:00:00.000Z", user.id);
    assert.equal(Boolean(Auth.getSession(expiredRequest)), false);

    const revoked = Auth.createSession(user.id);
    const revokedRequest = requestWithSession(revoked.token);
    Auth.invalidateSession(revokedRequest);
    assert.equal(Boolean(Auth.getSession(revokedRequest)), false);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS total FROM sessions WHERE user_id = ? AND revoked_at IS NOT NULL").get(user.id).total,
      1
    );
  });

  it("rejeita sessão de usuário inativo", () => {
    const user = createUser();
    const session = Auth.createSession(user.id);
    const sessionRequest = requestWithSession(session.token);
    assert.ok(Auth.getSession(sessionRequest));

    db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(user.id);
    assert.equal(Boolean(Auth.getSession(sessionRequest)), false);
  });

  it("assina, valida e expira o token CSRF do cadastro público", () => {
    const issuedAt = Date.parse("2026-08-01T12:00:00.000Z");
    const csrf = Auth.createPublicCsrf({ now: () => issuedAt });
    const req = {
      headers: { cookie: `emdia_signup_csrf=${encodeURIComponent(csrf.token)}` },
    };

    assert.equal(Auth.verifyPublicCsrf(req, { _csrf: csrf.token }, { now: () => issuedAt }), true);
    assert.equal(Auth.verifyPublicCsrf(req, { _csrf: `${csrf.token}x` }, { now: () => issuedAt }), false);
    assert.equal(
      Auth.verifyPublicCsrf(req, { _csrf: csrf.token }, { now: () => issuedAt + (10 * 60 + 1) * 1000 }),
      false,
    );
  });
});

function UserUpdate(user, passwordData) {
  return User.updateProfile(user.id, {
    name: user.name,
    email: user.email,
    phone_e164: "",
    ...passwordData,
  });
}
