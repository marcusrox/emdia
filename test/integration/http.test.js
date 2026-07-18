const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { db, resetDatabase } = require("../helpers/testDatabase");
const { createServer } = require("../../src/server");

beforeEach(resetDatabase);

async function login(agent) {
  return agent.post("/login").type("form").send({ email: "usuario@emdia.local", password: "emdia123" });
}

function csrfFrom(html) {
  return html.match(/name="_csrf" value="([^"]+)"/)?.[1] || "";
}

describe("integração HTTP Express", () => {
  it("responde health e ready sem autenticação", async () => {
    const app = createServer();
    await request(app).get("/health").expect(200).expect("Content-Type", /json/);
    await request(app).get("/ready").expect(200).expect({ ok: true, service: "emdia" });
  });

  it("redireciona acesso protegido e preserva sessão entre login e logout", async () => {
    const app = createServer();
    await request(app).get("/dashboard").expect(303).expect("Location", "/login");
    const agent = request.agent(app);
    const response = await login(agent);
    assert.equal(response.status, 303);
    assert.equal(response.headers.location, "/dashboard");
    const dashboard = await agent.get("/dashboard").expect(200);
    const csrf = csrfFrom(dashboard.text);
    assert.ok(csrf);
    await agent.post("/logout").type("form").send({ _csrf: csrf }).expect(303).expect("Location", "/login");
    await agent.get("/dashboard").expect(303).expect("Location", "/login");
  });

  it("bloqueia POST sem CSRF e restringe páginas administrativas", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);
    await agent.post("/settings").type("form").send({ font_scale: "large" }).expect(403);
    db.prepare("UPDATE users SET is_admin = 0 WHERE email = ?").run("usuario@emdia.local");
    await agent.get("/admin/users").expect(403);
    db.prepare("UPDATE users SET is_admin = 1 WHERE email = ?").run("usuario@emdia.local");
    const adminAgent = request.agent(app);
    await login(adminAgent);
    await adminAgent.get("/admin/users").expect(200);
  });

  it("aplica competência corrente e não expõe lançamento de outro usuário", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get("usuario@emdia.local");
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO users (id,name,email,password_hash,timezone,locale,is_active,is_admin,created_at,updated_at)
      VALUES ('other','Outro','outro@example.test',?,'America/Sao_Paulo','pt-BR',1,0,?,?)`).run(user.password_hash, now, now);
    db.prepare(`INSERT INTO financial_entries (id,user_id,entry_type,description,expected_amount_cents,realized_amount_cents,
      competence_month,due_date,status,origin,created_at,updated_at) VALUES ('secret','other','EXPENSE','Segredo',100,0,
      '2026-07','2026-07-10','PENDING','MANUAL',?,?)`).run(now, now);
    const entries = await agent.get("/entries").expect(200);
    assert.match(entries.text, /Competência/);
    const calendar = await agent.get("/calendar?competence=2026-07").expect(200);
    assert.match(calendar.text, /Agenda financeira/);
    assert.match(calendar.text, /Competência: julho de 2026/);
    assert.doesNotMatch(calendar.text, /Segredo/);
    await agent.get("/entries/secret").expect(404);
  });
});
