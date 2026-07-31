const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const request = require("supertest");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");
const { csrfFrom, login } = require("../helpers/http");
const { createServer } = require("../../src/server");
const Entry = require("../../src/models/FinancialEntry");
const User = require("../../src/models/User");
const { currentCompetence } = require("../../src/services/dateService");
const { getLogFilePath } = require("../../src/services/operationalLogger");
const { checkReadiness } = require("../../src/services/readinessService");

beforeEach(resetDatabase);

describe("integração HTTP Express", () => {
  it("responde health e ready sem autenticação", async () => {
    const app = createServer();
    await request(app).get("/health").expect(200).expect("Content-Type", /json/);
    await request(app).get("/ready").expect(200).expect({
      ok: true,
      service: "emdia",
      database: "ready",
      migrations: "ready",
    });
  });

  it("separa liveness de readiness indisponível", async () => {
    const app = createServer({
      readinessCheck: () => checkReadiness({
        db: { prepare() { throw new Error("banco indisponível"); } },
      }),
    });
    await request(app).get("/health").expect(200).expect({ ok: true, service: "emdia" });
    await request(app).get("/ready").expect(503).expect({
      ok: false,
      service: "emdia",
      error: "Dependência obrigatória indisponível.",
    });
  });

  it("aplica cabeçalhos seguros também em assets e erros", async () => {
    const app = createServer();
    for (const pathname of ["/login", "/public/css/styles.css", "/rota-inexistente"]) {
      const response = await request(app).get(pathname);
      assert.equal(response.headers["x-powered-by"], undefined);
      assert.equal(response.headers["x-content-type-options"], "nosniff");
      assert.equal(response.headers["x-frame-options"], "DENY");
      assert.equal(response.headers["strict-transport-security"], undefined);
      assert.match(response.headers["content-security-policy"], /script-src 'self'/);
      assert.doesNotMatch(response.headers["content-security-policy"], /unsafe-inline/);
    }

    const agent = request.agent(app);
    await login(agent);
    const dashboard = await agent.get("/dashboard").expect(200);
    assert.match(dashboard.headers["content-security-policy"], /img-src 'self' data: https:\/\/gravatar\.com/);
  });

  it("interrompe readiness quando o probe excede o timeout configurado", () => {
    let now = 0;
    const result = checkReadiness({
      db,
      timeoutMs: 5,
      now: () => {
        now += 10;
        return now;
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "timeout");
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

  it("monta uma rota representativa de cada módulo protegido", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);

    const routes = [
      "/dashboard",
      "/accounts",
      "/categories",
      "/profile",
      "/recurrences",
      "/entries",
      "/admin/users",
      "/runtime-environment",
    ];

    for (const route of routes) {
      await agent.get(route).expect(200);
    }
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

  it("compartilha a última competência entre todas as telas mensais por usuário", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get("usuario@emdia.local");

    const firstAccess = await agent.get("/entries").expect(200);
    assert.match(firstAccess.text, new RegExp(`name="competence" value="${currentCompetence(user.timezone)}"`));
    assert.equal(
      db.prepare("SELECT last_competence FROM users WHERE id = ?").get(user.id).last_competence,
      null
    );

    db.prepare("UPDATE users SET last_competence = 'invalida' WHERE id = ?").run(user.id);
    const invalidPreference = await agent.get("/entries").expect(200);
    assert.match(
      invalidPreference.text,
      new RegExp(`name="competence" value="${currentCompetence(user.timezone)}"`)
    );

    await agent.get("/entries?competence=2025-12").expect(200);
    assert.equal(
      db.prepare("SELECT last_competence FROM users WHERE id = ?").get(user.id).last_competence,
      "2025-12"
    );

    db.prepare("UPDATE users SET updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?").run(user.id);
    await agent.get("/entries?competence=2025-12").expect(200);
    assert.equal(
      db.prepare("SELECT updated_at FROM users WHERE id = ?").get(user.id).updated_at,
      "2000-01-01T00:00:00.000Z"
    );

    const dashboardRemembered = await agent.get("/dashboard").expect(200);
    assert.match(dashboardRemembered.text, /name="competence" value="2025-12"/);

    await agent.get("/dashboard?competence=2025-11").expect(200);
    assert.equal(
      db.prepare("SELECT last_competence FROM users WHERE id = ?").get(user.id).last_competence,
      "2025-11"
    );

    const calendarRemembered = await agent.get("/calendar").expect(200);
    assert.match(calendarRemembered.text, /name="competence" value="2025-11"/);

    await agent.get("/calendar?competence=2025-10").expect(200);
    assert.equal(
      db.prepare("SELECT last_competence FROM users WHERE id = ?").get(user.id).last_competence,
      "2025-10"
    );

    const remembered = await agent.get("/entries").expect(200);
    assert.match(remembered.text, /name="competence" value="2025-10"/);

    const invalid = await agent.get("/entries?competence=valor-invalido").expect(200);
    assert.match(invalid.text, /name="competence" value="2025-10"/);
    assert.equal(
      db.prepare("SELECT last_competence FROM users WHERE id = ?").get(user.id).last_competence,
      "2025-10"
    );

    await agent.get("/entries/export.csv?competence=2024-11").expect(200);
    assert.equal(
      db.prepare("SELECT last_competence FROM users WHERE id = ?").get(user.id).last_competence,
      "2025-10"
    );

    const other = createUser({
      email: "outra-pessoa@example.test",
      password: "senha-segura-123",
    });
    const otherAgent = request.agent(app);
    await login(otherAgent, { email: other.email, password: "senha-segura-123" });
    await otherAgent.get("/entries?competence=2024-03").expect(200);

    assert.equal(User.getLastCompetence(user.id), "2025-10");
    assert.equal(User.getLastCompetence(other.id), "2024-03");

    const newSession = request.agent(createServer());
    await login(newSession);
    const afterLogin = await newSession.get("/dashboard").expect(200);
    assert.match(afterLogin.text, /name="competence" value="2025-10"/);
  });

  it("mantém a competência persistida ao voltar do detalhe de um lançamento", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get("usuario@emdia.local");
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO financial_entries (
      id, user_id, entry_type, description, expected_amount_cents, realized_amount_cents,
      competence_month, due_date, status, origin, created_at, updated_at
    ) VALUES ('return-entry', ?, 'EXPENSE', 'Teste de retorno', 10000, 0,
      '2025-10', '2025-10-10', 'PENDING', 'MANUAL', ?, ?)`)
      .run(user.id, now, now);
    const entry = { id: "return-entry" };

    await agent.get("/entries?competence=2025-10").expect(200);
    const rememberedDetail = await agent.get(`/entries/${entry.id}`).expect(200);
    assert.match(rememberedDetail.text, /href="\/entries\?competence=2025-10"/);

    const calendarDetail = await agent
      .get(`/entries/${entry.id}?competence=2025-09&return_to=calendar`)
      .expect(200);
    assert.match(calendarDetail.text, /href="\/calendar\?competence=2025-09"/);
    assert.equal(User.getLastCompetence(user.id), "2025-09");

    const invalidDetail = await agent.get(`/entries/${entry.id}?competence=valor-invalido`).expect(200);
    assert.match(invalidDetail.text, /href="\/entries\?competence=2025-09"/);
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

  it("renderiza erro inesperado autenticado sem expor detalhes e relaciona o log", async () => {
    const app = createServer();
    const agent = request.agent(app);
    await login(agent);
    const originalDashboard = Entry.dashboard;
    const technicalMessage = '<img src=x onerror=alert("TASK049_PRIVATE_ERROR")>';
    const logPath = getLogFilePath();
    const previousLogSize = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

    Entry.dashboard = () => {
      throw new Error(technicalMessage);
    };

    try {
      const response = await agent.get("/dashboard").expect(500).expect("Content-Type", /html/);
      const errorId = response.text.match(/ERR-[A-F0-9]{12}/)?.[0];

      assert.ok(errorId);
      assert.match(response.text, /Não foi possível concluir a operação/);
      assert.match(response.text, /Código de diagnóstico/);
      assert.match(response.text, /href="\/dashboard"/);
      assert.doesNotMatch(response.text, /TASK049_PRIVATE_ERROR/);
      assert.doesNotMatch(response.text, /onerror=/);

      const newLogContent = fs.readFileSync(logPath).subarray(previousLogSize).toString("utf8");
      const loggedEvent = newLogContent
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .find((event) => event.requestId === errorId);

      assert.ok(loggedEvent);
      assert.equal(loggedEvent.event, "app.unexpected_error");
      assert.equal(loggedEvent.details.error.message, technicalMessage);
      assert.match(loggedEvent.details.error.stack, /TASK049_PRIVATE_ERROR/);
    } finally {
      Entry.dashboard = originalDashboard;
    }
  });

  it("renderiza erro seguro antes da autenticação", async () => {
    const originalEnsureDefaultUser = User.ensureDefaultUser;
    User.ensureDefaultUser = () => {
      throw new Error("TASK049_LOGIN_PRIVATE_ERROR");
    };

    try {
      const response = await request(createServer()).get("/login").expect(500).expect("Content-Type", /html/);

      assert.match(response.text, /Não foi possível concluir a operação/);
      assert.match(response.text, /ERR-[A-F0-9]{12}/);
      assert.match(response.text, /href="\/login"/);
      assert.doesNotMatch(response.text, /TASK049_LOGIN_PRIVATE_ERROR/);
    } finally {
      User.ensureDefaultUser = originalEnsureDefaultUser;
    }
  });

  it("preserva resposta JSON genérica quando a falha ocorre antes da autenticação", async () => {
    const originalEnsureDefaultUser = User.ensureDefaultUser;
    User.ensureDefaultUser = () => {
      throw new Error("TASK049_JSON_PRIVATE_ERROR");
    };

    try {
      const response = await request(createServer())
        .get("/operational-logs/events")
        .expect(500)
        .expect("Content-Type", /json/);

      assert.equal(response.body.error, "Não foi possível concluir a operação.");
      assert.match(response.body.error_id, /^ERR-[A-F0-9]{12}$/);
      assert.doesNotMatch(JSON.stringify(response.body), /TASK049_JSON_PRIVATE_ERROR/);
    } finally {
      User.ensureDefaultUser = originalEnsureDefaultUser;
    }
  });
});

function restoreEnvironmentVariable(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
