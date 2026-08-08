const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");
const { login } = require("../helpers/http");
const { createServer } = require("../../src/server");
const AuditLog = require("../../src/models/AuditLog");

beforeEach(resetDatabase);

describe("auditoria funcional e operação", () => {
  it("sanitiza payload sensível, limita conteúdo e preserva dados investigáveis", () => {
    const user = createUser();
    const longText = "x".repeat(350);
    const date = new Date("2026-08-07T12:00:00.000Z");

    AuditLog.record(user.id, "financial_entry", "ent_1", "updated", {
      description: longText,
      password: "segredo",
      nested: {
        authorization_header: "Bearer token",
        safe: "visível",
        deep: { one: { two: { three: { four: "não deve aparecer" } } } },
      },
      occurred_at: date,
      items: [{ sessionToken: "secreto", value: 10 }],
    });

    const row = db.prepare("SELECT * FROM audit_logs WHERE user_id = ?").get(user.id);
    const payload = JSON.parse(row.payload_json);
    assert.equal(payload.password, "[redacted]");
    assert.equal(payload.nested.authorization_header, "[redacted]");
    assert.equal(payload.nested.safe, "visível");
    assert.equal(payload.description.length, 303);
    assert.equal(payload.occurred_at, date.toISOString());
    assert.equal(payload.items[0].sessionToken, "[redacted]");
    assert.equal(payload.nested.deep.one.two.three, "[truncated]");
    assert.doesNotMatch(row.payload_json, /Bearer token|segredo/);
  });

  it("filtra, pagina e isola consulta e histórico por usuário", () => {
    const first = createUser({ email: "audit-first@example.test" });
    const second = createUser({ email: "audit-second@example.test" });

    AuditLog.record(first.id, "financial_entry", "ent_shared", "created", { marker: "primeiro" });
    AuditLog.record(first.id, "financial_entry", "ent_shared", "updated", { marker: "segundo" });
    AuditLog.record(second.id, "financial_entry", "ent_shared", "created", { marker: "privado" });

    const firstRows = db.prepare("SELECT id FROM audit_logs WHERE user_id = ? ORDER BY rowid").all(first.id);
    db.prepare("UPDATE audit_logs SET created_at = ? WHERE id = ?").run("2026-08-06T10:00:00.000Z", firstRows[0].id);
    db.prepare("UPDATE audit_logs SET created_at = ? WHERE id = ?").run("2026-08-07T10:00:00.000Z", firstRows[1].id);

    const filtered = AuditLog.list(first.id, {
      from_date: "2026-08-07",
      to_date: "2026-08-07",
      entity_type: "financial_entry",
      entity_id: "ent_shared",
      action: "updated",
      q: "segundo",
      limit: 500,
      offset: -10,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, firstRows[1].id);
    assert.equal(filtered[0].user_email, first.email);

    assert.equal(AuditLog.getById(second.id, firstRows[0].id), undefined);
    assert.equal(AuditLog.getById(first.id, firstRows[0].id).id, firstRows[0].id);
    assert.deepEqual(
      AuditLog.listEntityHistory(first.id, "financial_entry", "ent_shared").map((row) => row.action),
      ["created", "updated"],
    );
  });

  it("renderiza auditoria filtrada sem expor registros de outro usuário", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);
    const user = db.prepare("SELECT * FROM users WHERE email = 'usuario@emdia.local'").get();
    const other = createUser({ email: "other-audit@example.test" });
    AuditLog.record(user.id, "financial_entry", "ent_visible", "updated", { note: "MARCADOR_VISÍVEL" });
    AuditLog.record(user.id, "category", "cat_hidden_filter", "created", { note: "FILTRO_OCULTO" });
    AuditLog.record(other.id, "financial_entry", "ent_private", "updated", { note: "MARCADOR_PRIVADO" });

    const response = await agent
      .get("/audit?entity_type=financial_entry&action=updated&q=MARCADOR_VIS%C3%8DVEL")
      .expect(200);

    assert.match(response.text, /ent_visible/);
    assert.match(response.text, /MARCADOR_VISÍVEL/);
    assert.doesNotMatch(response.text, /FILTRO_OCULTO|MARCADOR_PRIVADO|ent_private/);
  });

  it("restringe logs operacionais a administradores e preserva o contrato JSON", async () => {
    const app = createServer();
    const adminAgent = request.agent(app);
    await login(adminAgent);

    const page = await adminAgent.get("/operational-logs?level=error&limit=1").expect(200);
    assert.match(page.text, /Logs operacionais/);

    const events = await adminAgent
      .get("/operational-logs/events?level=error&event=app&limit=1")
      .expect(200)
      .expect("Content-Type", /json/);
    assert.ok(Array.isArray(events.body.entries));
    assert.ok(Array.isArray(events.body.dates));
    assert.equal(events.body.filters.level, "error");
    assert.equal(events.body.filters.event, "app");
    assert.equal(events.body.filters.limit, 1);

    db.prepare("UPDATE users SET is_admin = 0 WHERE email = 'usuario@emdia.local'").run();
    const ordinaryAgent = request.agent(app);
    await login(ordinaryAgent);
    await ordinaryAgent.get("/operational-logs").expect(403);
    await ordinaryAgent.get("/operational-logs/events").expect(403);
    await ordinaryAgent.get("/runtime-environment").expect(403);
  });
});
