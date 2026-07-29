const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");
const { requestWithSession } = require("../helpers/http");
const { createServer } = require("../../src/server");
const Auth = require("../../src/services/authService");

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
});
