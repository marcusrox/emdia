const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createFinancialFixture, db, resetDatabase } = require("../helpers/testDatabase");
const Entry = require("../../src/models/FinancialEntry");
const Recurrence = require("../../src/models/Recurrence");

beforeEach(resetDatabase);

function createEntry(fixture, overrides = {}) {
  return Entry.create(fixture.user, {
    entry_type: "EXPENSE", description: "Conta de teste", category_id: fixture.categoryId,
    financial_account_id: fixture.accountId, expected_amount: "100,00", realized_amount: "0,00",
    competence_month: "2026-07", due_date: "2999-07-10", ...overrides,
  });
}

function settlement(fixture, overrides = {}) {
  return { financial_account_id: fixture.accountId, principal: "40,00", interest: "0,00",
    penalty: "0,00", discount: "0,00", other_adjustment: "0,00", settled_at: "2026-07-10", ...overrides };
}

describe("models financeiros", () => {
  it("registra baixa parcial e total com settlement e auditoria", () => {
    const fixture = createFinancialFixture();
    const entry = createEntry(fixture);
    const partial = Entry.settle(fixture.user, entry.id, settlement(fixture));
    assert.equal(partial.realized_amount_cents, 4000);
    assert.equal(partial.status, "PARTIALLY_PAID");
    const paid = Entry.settle(fixture.user, entry.id, settlement(fixture, { principal: "60,00" }));
    assert.equal(paid.realized_amount_cents, 10000);
    assert.equal(paid.status, "PAID");
    assert.equal(db.prepare("SELECT COUNT(*) total FROM settlements WHERE financial_entry_id = ?").get(entry.id).total, 2);
    assert.equal(db.prepare("SELECT COUNT(*) total FROM audit_logs WHERE entity_id = ? AND action = 'settled'").get(entry.id).total, 2);
  });

  it("calcula ajustes e bloqueia principal acima do saldo", () => {
    const fixture = createFinancialFixture();
    const entry = createEntry(fixture);
    const updated = Entry.settle(fixture.user, entry.id, settlement(fixture, {
      principal: "40,00", interest: "2,00", penalty: "1,00", discount: "0,50", other_adjustment: "0,25",
    }));
    assert.equal(updated.realized_amount_cents, 4275);
    assert.throws(
      () => Entry.settle(fixture.user, entry.id, settlement(fixture, { principal: "60,00" })),
      (error) => /saldo em aberto/i.test(error.errors?.principal || ""),
    );
  });

  it("faz rollback completo quando a auditoria falha", () => {
    const fixture = createFinancialFixture();
    const entry = createEntry(fixture);
    db.exec("CREATE TRIGGER fail_settlement_audit BEFORE INSERT ON audit_logs WHEN NEW.action = 'settled' BEGIN SELECT RAISE(ABORT, 'audit failure'); END;");
    assert.throws(() => Entry.settle(fixture.user, entry.id, settlement(fixture)), /audit failure/);
    assert.equal(db.prepare("SELECT COUNT(*) total FROM settlements WHERE financial_entry_id = ?").get(entry.id).total, 0);
    assert.equal(Entry.getById(fixture.user, entry.id).realized_amount_cents, 0);
    db.exec("DROP TRIGGER fail_settlement_audit;");
  });

  it("estorna baixa, recalcula total e preserva histórico", () => {
    const fixture = createFinancialFixture();
    const entry = createEntry(fixture);
    Entry.settle(fixture.user, entry.id, settlement(fixture));
    Entry.settle(fixture.user, entry.id, settlement(fixture, { principal: "60,00" }));
    const settlements = db.prepare("SELECT * FROM settlements WHERE financial_entry_id = ? ORDER BY principal_cents").all(entry.id);

    const reversed = Entry.reverseSettlement(fixture.user, settlements[1].id, {
      reason: "Baixa registrada em duplicidade", confirm_reversal: "yes",
    });

    assert.equal(reversed.realized_amount_cents, 4000);
    assert.equal(reversed.status, "PARTIALLY_PAID");
    assert.equal(db.prepare("SELECT COUNT(*) total FROM settlements WHERE financial_entry_id = ?").get(entry.id).total, 2);
    assert.equal(db.prepare("SELECT reason FROM settlement_reversals WHERE settlement_id = ?").get(settlements[1].id).reason, "Baixa registrada em duplicidade");
    assert.equal(db.prepare("SELECT COUNT(*) total FROM audit_logs WHERE entity_id = ? AND action = 'settlement_reversed'").get(entry.id).total, 1);
    assert.equal(Entry.reverseSettlement(fixture.user, settlements[1].id, { reason: "Repetido", confirm_reversal: "yes" }), null);
  });

  it("valida estorno, isola usuário e reverte tudo quando auditoria falha", () => {
    const fixture = createFinancialFixture();
    const other = createFinancialFixture();
    const entry = createEntry(fixture);
    Entry.settle(fixture.user, entry.id, settlement(fixture, { principal: "100,00" }));
    const item = db.prepare("SELECT * FROM settlements WHERE financial_entry_id = ?").get(entry.id);

    assert.throws(() => Entry.reverseSettlement(fixture.user, item.id, { reason: "" }), /motivo/i);
    assert.equal(Entry.reverseSettlement(other.user, item.id, { reason: "Tentativa", confirm_reversal: "yes" }), null);

    db.exec("CREATE TRIGGER fail_reversal_audit BEFORE INSERT ON audit_logs WHEN NEW.action = 'settlement_reversed' BEGIN SELECT RAISE(ABORT, 'audit reversal failure'); END;");
    assert.throws(() => Entry.reverseSettlement(fixture.user, item.id, { reason: "Teste rollback", confirm_reversal: "yes" }), /audit reversal failure/);
    assert.equal(db.prepare("SELECT COUNT(*) total FROM settlement_reversals WHERE settlement_id = ?").get(item.id).total, 0);
    assert.equal(Entry.getById(fixture.user, entry.id).realized_amount_cents, 10000);
    db.exec("DROP TRIGGER fail_reversal_audit;");
  });

  it("isola lançamentos e baixas por usuário", () => {
    const first = createFinancialFixture();
    const second = createFinancialFixture();
    const entry = createEntry(first);
    assert.equal(Entry.getById(second.user, entry.id), undefined);
    assert.equal(Entry.settle(second.user, entry.id, settlement(second)), null);
    assert.equal(db.prepare("SELECT COUNT(*) total FROM settlements").get().total, 0);
  });

  it("gera recorrência uma única vez e aplica LAST_VALID_DAY", () => {
    const fixture = createFinancialFixture();
    const recurrence = Recurrence.create(fixture.user, {
      description: "Recorrência teste", category_id: fixture.categoryId, financial_account_id: fixture.accountId,
      expected_amount: "50,00", due_day: "31", start_competence_month: "2024-01",
      end_competence_month: "2024-12", status: "ACTIVE",
    });
    assert.equal(Recurrence.generateForCompetence(fixture.user, "2024-02"), 1);
    assert.equal(Recurrence.generateForCompetence(fixture.user, "2024-02"), 0);
    const generated = db.prepare("SELECT * FROM financial_entries WHERE recurrence_rule_id = ?").get(recurrence.id);
    assert.equal(generated.due_date, "2024-02-29");
    assert.equal(generated.origin, "RECURRENCE");
  });

  it("respeita pausa, início, término e usuário", () => {
    const fixture = createFinancialFixture();
    const other = createFinancialFixture();
    const recurrence = Recurrence.create(fixture.user, {
      description: "Recorrência limitada", category_id: fixture.categoryId, financial_account_id: fixture.accountId,
      expected_amount: "50,00", due_day: "10", start_competence_month: "2026-03",
      end_competence_month: "2026-05", status: "ACTIVE",
    });
    assert.equal(Recurrence.generateForCompetence(fixture.user, "2026-02"), 0);
    assert.equal(Recurrence.generateForCompetence(fixture.user, "2026-06"), 0);
    Recurrence.pause(fixture.user, recurrence.id);
    assert.equal(Recurrence.generateForCompetence(fixture.user, "2026-04"), 0);
    assert.equal(Recurrence.getById(other.user.id, recurrence.id), undefined);
  });
});
