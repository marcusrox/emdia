const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");
const { requestWithSession } = require("../helpers/http");
const User = require("../../src/models/User");
const Auth = require("../../src/services/authService");

beforeEach(resetDatabase);

describe("administração de usuários", () => {
  it("cobre cadastro, validação, atualização e filtros administrativos", () => {
    const admin = createUser({ isAdmin: true });
    const invalid = User.createAdmin({
      name: "",
      email: "invalido",
      new_password: "123",
      confirm_password: "456",
    });
    assert.equal(invalid.ok, false);
    assert.ok(invalid.errors.name);
    assert.ok(invalid.errors.email);
    assert.ok(invalid.errors.new_password);
    assert.ok(invalid.errors.confirm_password);

    const created = User.createAdmin(adminPayload({
      name: "Pessoa Gerenciada",
      email: "gerenciada@example.test",
    }));
    assert.equal(created.ok, true);
    assert.equal(created.user.is_admin, 0);

    const updated = User.updateAdmin(admin.id, created.user.id, adminPayload({
      name: "Pessoa Administradora",
      email: created.user.email,
      role: "admin",
    }));
    assert.equal(updated.ok, true);
    assert.equal(updated.user.is_admin, 1);
    assert.equal(User.listForAdmin({ q: "Administradora", role: "admin", status: "active" }).length, 1);
  });

  it("impede autobloqueio e remoção do último administrador", () => {
    const onlyAdmin = createUser({ isAdmin: true });

    assert.deepEqual(
      User.setActiveAdmin(onlyAdmin.id, onlyAdmin.id, false),
      { ok: false, reason: "self-block" }
    );
    assert.deepEqual(
      User.setActiveAdmin("outro-ator", onlyAdmin.id, false),
      { ok: false, reason: "last-admin" }
    );
    assert.equal(User.getAdminById(onlyAdmin.id).is_active, 1);
  });

  it("revoga sessões ao bloquear usuário e redefinir senha", () => {
    const admin = createUser({ isAdmin: true });
    const blockedUser = createUser({ email: "bloqueado@example.test" });
    const blockedSession = Auth.createSession(blockedUser.id);

    const blocked = User.setActiveAdmin(admin.id, blockedUser.id, false);
    assert.equal(blocked.ok, true);
    assert.equal(Boolean(Auth.getSession(requestWithSession(blockedSession.token))), false);
    assert.ok(db.prepare("SELECT revoked_at FROM sessions WHERE user_id = ?").get(blockedUser.id).revoked_at);

    const resetUser = createUser({ email: "redefinido@example.test", password: "senha-antiga" });
    const resetSession = Auth.createSession(resetUser.id);
    const reset = User.resetPasswordAdmin(resetUser.id, {
      new_password: "senha-nova",
      confirm_password: "senha-nova",
    });
    assert.equal(reset.ok, true);
    assert.equal(Boolean(Auth.getSession(requestWithSession(resetSession.token))), false);
    const stored = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(resetUser.id);
    assert.equal(Auth.verifyPassword("senha-antiga", stored.password_hash), false);
    assert.equal(Auth.verifyPassword("senha-nova", stored.password_hash), true);
  });
});

function adminPayload(overrides = {}) {
  return {
    name: "Pessoa",
    email: "pessoa@example.test",
    phone_e164: "",
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    role: "user",
    status: "active",
    new_password: "senha123",
    confirm_password: "senha123",
    ...overrides,
  };
}
