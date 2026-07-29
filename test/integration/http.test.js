const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { db, resetDatabase } = require("../helpers/testDatabase");
const { createServer } = require("../../src/server");
const Entry = require("../../src/models/FinancialEntry");

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

  it("não ativa login automático apenas por NODE_ENV=development", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAutoLogin = process.env.EMDIA_AUTO_LOGIN;
    process.env.NODE_ENV = "development";
    delete process.env.EMDIA_AUTO_LOGIN;

    try {
      const app = createServer();
      await request(app).get("/dashboard").set("Host", "localhost").expect(303).expect("Location", "/login");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      restoreEnvironmentVariable("EMDIA_AUTO_LOGIN", previousAutoLogin);
    }
  });

  it("ativa login automático local quando EMDIA_AUTO_LOGIN=true", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAutoLogin = process.env.EMDIA_AUTO_LOGIN;
    process.env.NODE_ENV = "test";
    process.env.EMDIA_AUTO_LOGIN = "true";

    try {
      const app = createServer();
      await request(app).get("/login").set("Host", "localhost").expect(303).expect("Location", "/dashboard");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      restoreEnvironmentVariable("EMDIA_AUTO_LOGIN", previousAutoLogin);
    }
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

  it("renderiza Gravatar no topo, perfil e cadastro de usuários", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);

    const profile = await agent.get("/profile").expect(200);
    assert.match(profile.text, /https:\/\/gravatar\.com\/avatar\/322ce3d79ee9a260904bf719ed85257720a335ee044e9fef95ad5255dc5684ae\?/);
    assert.match(profile.text, /d=initials&amp;r=g&amp;s=128&amp;name=Usu%C3%A1rio\+EmDia/);
    assert.match(profile.text, /href="https:\/\/gravatar\.com\/profile\/avatars"/);
    assert.match(profile.text, /referrerpolicy="no-referrer"/);

    const users = await agent.get("/admin/users").expect(200);
    assert.match(users.text, /class="user-admin-identity"/);
    assert.match(users.text, /img class="gravatar-avatar"/);
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
    assert.match(calendar.text, /href="\/entries\/new\?competence=2026-07"/);
    assert.match(calendar.text, /Novo lançamento/);
    assert.doesNotMatch(calendar.text, /Segredo/);
    await agent.get("/entries/secret").expect(404);
  });

  it("exporta CSV filtrado, com nome previsível e auditoria", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get("usuario@emdia.local");
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO financial_entries (id,user_id,entry_type,description,expected_amount_cents,realized_amount_cents,
      competence_month,due_date,status,origin,created_at,updated_at) VALUES ('csv-entry',?,'EXPENSE','=FÓRMULA',12345,0,
      '2026-07','2026-07-10','PENDING','MANUAL',?,?)`).run(user.id, now, now);
    const response = await agent.get("/entries/export.csv?competence=2026-07&q=FÓRMULA").expect(200);
    assert.match(response.headers["content-type"], /text\/csv/);
    assert.match(response.headers["content-disposition"], /emdia-lancamentos-2026-07\.csv/);
    assert.match(response.text, /'=FÓRMULA/);
    const audit = db.prepare("SELECT * FROM audit_logs WHERE action = 'exported_csv'").get();
    assert.ok(audit);
    assert.equal(JSON.parse(audit.payload_json).record_count, 1);
  });

  it("permite escolher quitação abaixo do previsto e mostra a diferença", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get("usuario@emdia.local");
    const now = new Date().toISOString();
    let account = db.prepare("SELECT * FROM financial_accounts WHERE user_id = ? AND is_active = 1 LIMIT 1").get(user.id);
    let category = db.prepare("SELECT * FROM categories WHERE user_id = ? AND entry_type = 'EXPENSE' AND is_active = 1 LIMIT 1").get(user.id);
    if (!account) {
      db.prepare(`INSERT INTO financial_accounts
        (id,user_id,name,type,initial_balance_cents,is_active,created_at,updated_at)
        VALUES ('acc-http-shortfall',?,'Conta HTTP','CHECKING',0,1,?,?)`).run(user.id, now, now);
      account = db.prepare("SELECT * FROM financial_accounts WHERE id = 'acc-http-shortfall'").get();
    }
    if (!category) {
      db.prepare(`INSERT INTO categories
        (id,user_id,name,entry_type,is_active,created_at,updated_at)
        VALUES ('cat-http-shortfall',?,'Consumo','EXPENSE',1,?,?)`).run(user.id, now, now);
      category = db.prepare("SELECT * FROM categories WHERE id = 'cat-http-shortfall'").get();
    }
    const entry = Entry.create(user, {
      entry_type: "EXPENSE",
      description: "Conta estimada",
      category_id: category.id,
      financial_account_id: account.id,
      expected_amount: "100,00",
      realized_amount: "0,00",
      competence_month: "2026-07",
      due_date: "2999-07-10",
    });

    const detail = await agent.get(`/entries/${entry.id}`).expect(200);
    assert.match(detail.text, /data-settlement-shortfall/);
    assert.match(detail.text, /name="settlement_completion" value="PARTIAL"/);
    assert.match(detail.text, /name="settlement_completion" value="FINAL"/);
    const csrf = csrfFrom(detail.text);

    await agent.post(`/entries/${entry.id}/settlements`).type("form").send({
      _csrf: csrf,
      financial_account_id: account.id,
      principal: "80,00",
      interest: "0,00",
      penalty: "0,00",
      discount: "0,00",
      settled_at: "2026-07-10",
      settlement_completion: "FINAL",
    }).expect(303).expect("Location", `/entries/${entry.id}`);

    const settled = await agent.get(`/entries/${entry.id}`).expect(200);
    assert.match(settled.text, /Diferença para o previsto/);
    assert.match(settled.text, /R\$[^0-9]*20,00/);
    assert.match(settled.text, /Quitação final/);
    assert.match(settled.text, /Baixa indisponível/);
    assert.equal(db.prepare("SELECT closes_entry FROM settlements WHERE financial_entry_id = ?").get(entry.id).closes_entry, 1);
  });
});

function restoreEnvironmentVariable(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
