const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { db, resetDatabase } = require("../helpers/testDatabase");
const { csrfFrom, login } = require("../helpers/http");
const { createServer } = require("../../src/server");
const Entry = require("../../src/models/FinancialEntry");

beforeEach(resetDatabase);

describe("rotas financeiras críticas", () => {
  it("valida e executa criação, edição, duplicação, cancelamento e exclusão mensal", async () => {
    const context = await financialHttpContext();
    const newForm = await context.agent.get("/entries/new?competence=2026-08").expect(200);
    const csrf = csrfFrom(newForm.text);

    const invalidCreate = await context.agent.post("/entries").type("form").send({
      _csrf: csrf,
      entry_type: "TRANSFER",
      description: "",
      category_id: "categoria-inexistente",
      financial_account_id: "conta-inexistente",
      expected_amount: "abc",
      competence_month: "2026-13",
      due_date: "2026-02-30",
    }).expect(400);

    assert.match(invalidCreate.text, /Informe a descrição/);
    assert.match(invalidCreate.text, /Selecione um tipo válido/);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_entries").get().total, 0);

    await context.agent.post("/entries").type("form").send({
      _csrf: csrf,
      ...entryPayload(context),
    }).expect(303).expect("Location", "/entries?competence=2026-08");

    const entry = db.prepare("SELECT * FROM financial_entries WHERE description = 'Energia elétrica'").get();
    assert.ok(entry);
    assert.equal(entry.expected_amount_cents, 10000);

    const editForm = await context.agent.get(`/entries/${entry.id}/edit`).expect(200);
    const invalidUpdate = await context.agent.post(`/entries/${entry.id}`).type("form").send({
      _csrf: csrfFrom(editForm.text),
      ...entryPayload(context, { description: "", expected_amount: "valor inválido" }),
    }).expect(400);
    assert.match(invalidUpdate.text, /Informe a descrição/);
    assert.equal(Entry.getById(context.user.id, entry.id).description, "Energia elétrica");

    await context.agent.post(`/entries/${entry.id}`).type("form").send({
      _csrf: csrfFrom(editForm.text),
      ...entryPayload(context, { description: "Energia atualizada", expected_amount: "120,00" }),
    }).expect(303).expect("Location", "/entries?competence=2026-08");

    await context.agent.post(`/entries/${entry.id}/duplicate`).type("form").send({
      _csrf: csrfFrom(editForm.text),
    }).expect(303).expect("Location", "/entries?competence=2026-08");
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_entries").get().total, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM audit_logs WHERE action = 'duplicated'").get().total, 1);

    await context.agent.post(`/entries/${entry.id}/cancel`).type("form").send({
      _csrf: csrfFrom(editForm.text),
    }).expect(303).expect("Location", "/entries?competence=2026-08");
    assert.equal(Entry.getById(context.user.id, entry.id).status, "CANCELLED");

    const entriesPage = await context.agent.get("/entries?competence=2026-08").expect(200);
    await context.agent.post("/entries/month/delete").type("form").send({
      _csrf: csrfFrom(entriesPage.text),
      competence_month: "2026-08",
      confirmation: "2026-07",
    }).expect(400);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_entries WHERE deleted_at IS NULL").get().total, 2);

    await context.agent.post("/entries/month/delete").type("form").send({
      _csrf: csrfFrom(entriesPage.text),
      competence_month: "2026-08",
      confirmation: "2026-08",
      acknowledge_impact: "on",
    }).expect(303).expect("Location", "/entries?competence=2026-08&deleted_count=2");
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_entries WHERE deleted_at IS NULL").get().total, 0);
  });

  it("impede excesso sem confirmação, bloqueia nova baixa e estorna pelo formulário", async () => {
    const context = await financialHttpContext();
    const entry = Entry.create(context.user, entryPayload(context));
    const detail = await context.agent.get(`/entries/${entry.id}`).expect(200);
    const csrf = csrfFrom(detail.text);

    await context.agent.post(`/entries/${entry.id}/settlements`).type("form").send({
      _csrf: csrf,
      ...settlementPayload(context, { principal: "80,00" }),
    }).expect(303).expect("Location", `/entries/${entry.id}`);

    const excess = await context.agent.post(`/entries/${entry.id}/settlements`).type("form").send({
      _csrf: csrf,
      ...settlementPayload(context, { principal: "30,00" }),
    }).expect(400);
    assert.match(excess.text, /acima do valor previsto/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM settlements WHERE financial_entry_id = ?").get(entry.id).total, 1);

    await context.agent.post(`/entries/${entry.id}/settlements`).type("form").send({
      _csrf: csrf,
      ...settlementPayload(context, { principal: "30,00", confirm_excess: "yes" }),
    }).expect(303).expect("Location", `/entries/${entry.id}`);

    const paid = Entry.getById(context.user.id, entry.id);
    assert.equal(paid.status, "PAID");
    assert.equal(paid.realized_amount_cents, 11000);

    const blocked = await context.agent.post(`/entries/${entry.id}/settlements`).type("form").send({
      _csrf: csrf,
      ...settlementPayload(context, { principal: "1,00" }),
    }).expect(409);
    assert.match(blocked.text, /Baixa indisponível|não aceita novas baixas/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM settlements WHERE financial_entry_id = ?").get(entry.id).total, 2);

    const lastSettlement = db.prepare(
      "SELECT * FROM settlements WHERE financial_entry_id = ? ORDER BY created_at DESC, id DESC LIMIT 1"
    ).get(entry.id);

    const invalidReversal = await context.agent.post(`/settlements/${lastSettlement.id}/reverse`).type("form").send({
      _csrf: csrf,
      reason: "Correção necessária",
    }).expect(400);
    assert.match(invalidReversal.text, /Confirme que deseja estornar/);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM settlement_reversals").get().total, 0);

    await context.agent.post(`/settlements/${lastSettlement.id}/reverse`).type("form").send({
      _csrf: csrf,
      reason: "Baixa lançada com valor incorreto",
      confirm_reversal: "yes",
    }).expect(303).expect("Location", `/entries/${entry.id}`);

    const reopened = Entry.getById(context.user.id, entry.id);
    assert.equal(reopened.status, "PARTIALLY_PAID");
    assert.equal(reopened.realized_amount_cents, 8000);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM settlement_reversals").get().total, 1);
  });

  it("não altera dados com CSRF ausente nem com identificadores de outro usuário", async () => {
    const context = await financialHttpContext();
    const entry = Entry.create(context.user, entryPayload(context));

    await context.agent.post(`/entries/${entry.id}/cancel`).type("form").send({}).expect(403);
    assert.notEqual(Entry.getById(context.user.id, entry.id).status, "CANCELLED");

    const now = new Date().toISOString();
    db.prepare(`INSERT INTO users
      (id,name,email,password_hash,timezone,locale,is_active,is_admin,created_at,updated_at)
      VALUES ('usr_other','Outra pessoa','other-financial@example.test',?,'America/Sao_Paulo','pt-BR',1,0,?,?)`)
      .run(context.user.password_hash, now, now);
    db.prepare(`INSERT INTO financial_entries
      (id,user_id,entry_type,description,expected_amount_cents,realized_amount_cents,competence_month,due_date,status,origin,created_at,updated_at)
      VALUES ('ent_other','usr_other','EXPENSE','Privado',10000,0,'2026-08','2999-08-10','PENDING','MANUAL',?,?)`)
      .run(now, now);

    const page = await context.agent.get("/entries?competence=2026-08").expect(200);
    await context.agent.post("/entries/ent_other/settlements").type("form").send({
      _csrf: csrfFrom(page.text),
      ...settlementPayload(context, { principal: "100,00" }),
    }).expect(303).expect("Location", "/entries");
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM settlements WHERE financial_entry_id = 'ent_other'").get().total, 0);
  });
});

async function financialHttpContext() {
  const app = createServer();
  const agent = request.agent(app);
  await login(agent);
  const user = db.prepare("SELECT * FROM users WHERE email = 'usuario@emdia.local'").get();
  const now = new Date().toISOString();
  const accountId = "acc_http_financial";
  const categoryId = "cat_http_financial";

  db.prepare(`INSERT INTO financial_accounts
    (id,user_id,name,type,initial_balance_cents,is_active,created_at,updated_at)
    VALUES (?,?,'Conta HTTP','CHECKING',0,1,?,?)`).run(accountId, user.id, now, now);
  db.prepare(`INSERT INTO categories
    (id,user_id,name,entry_type,is_active,created_at,updated_at)
    VALUES (?,?,'Despesas HTTP','EXPENSE',1,?,?)`).run(categoryId, user.id, now, now);

  return { accountId, agent, categoryId, user };
}

function entryPayload(context, overrides = {}) {
  return {
    entry_type: "EXPENSE",
    description: "Energia elétrica",
    category_id: context.categoryId,
    financial_account_id: context.accountId,
    expected_amount: "100,00",
    competence_month: "2026-08",
    due_date: "2999-08-10",
    party_name: "Concessionária",
    notes: "",
    ...overrides,
  };
}

function settlementPayload(context, overrides = {}) {
  return {
    financial_account_id: context.accountId,
    principal: "100,00",
    interest: "0,00",
    penalty: "0,00",
    discount: "0,00",
    other_adjustment: "0,00",
    settled_at: "2026-08-07",
    settlement_completion: "PARTIAL",
    ...overrides,
  };
}
