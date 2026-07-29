const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { createFinancialFixture, db, resetDatabase } = require("../helpers/testDatabase");
const Entry = require("../../src/models/FinancialEntry");
const Recurrence = require("../../src/models/Recurrence");
const User = require("../../src/models/User");
const settlementClosureMigration = require("../../src/database/migrations/006_add_settlement_closure");

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

  it("calcula ajustes e exige confirmação para valor realizado acima do previsto", () => {
    const fixture = createFinancialFixture();
    const entry = createEntry(fixture);
    const updated = Entry.settle(fixture.user, entry.id, settlement(fixture, {
      principal: "40,00", interest: "2,00", penalty: "1,00", discount: "0,50", other_adjustment: "0,25",
    }));
    assert.equal(updated.realized_amount_cents, 4275);
    assert.throws(
      () => Entry.settle(fixture.user, entry.id, settlement(fixture, { principal: "60,00" })),
      (error) => /acima do valor previsto/i.test(error.errors?.confirm_excess || ""),
    );
    assert.equal(db.prepare("SELECT COUNT(*) total FROM settlements WHERE financial_entry_id = ?").get(entry.id).total, 1);

    const paid = Entry.settle(fixture.user, entry.id, settlement(fixture, {
      principal: "60,00", confirm_excess: "yes",
    }));
    assert.equal(paid.realized_amount_cents, 10275);
    assert.equal(paid.status, "PAID");
    const audit = db.prepare("SELECT payload_json FROM audit_logs WHERE entity_id = ? AND action = 'settled' ORDER BY created_at DESC").get(entry.id);
    assert.equal(JSON.parse(audit.payload_json).excess_cents, 275);
  });

  it("distingue baixa parcial de quitação abaixo do previsto", () => {
    const fixture = createFinancialFixture();
    const partialEntry = createEntry(fixture);
    const partial = Entry.settle(fixture.user, partialEntry.id, settlement(fixture, {
      principal: "80,00",
    }));

    assert.equal(partial.realized_amount_cents, 8000);
    assert.equal(partial.status, "PARTIALLY_PAID");
    assert.equal(partial.has_active_closing_settlement, 0);
    assert.equal(db.prepare("SELECT closes_entry FROM settlements WHERE financial_entry_id = ?").get(partialEntry.id).closes_entry, 0);

    const finalEntry = createEntry(fixture);
    const paid = Entry.settle(fixture.user, finalEntry.id, settlement(fixture, {
      principal: "80,00",
      settlement_completion: "FINAL",
    }));

    assert.equal(paid.expected_amount_cents, 10000);
    assert.equal(paid.realized_amount_cents, 8000);
    assert.equal(paid.status, "PAID");
    assert.equal(paid.has_active_closing_settlement, 1);
    assert.equal(db.prepare("SELECT closes_entry FROM settlements WHERE financial_entry_id = ?").get(finalEntry.id).closes_entry, 1);
    assert.throws(
      () => Entry.settle(fixture.user, finalEntry.id, settlement(fixture, { principal: "20,00" })),
      (error) => error.code === "SETTLEMENT_NOT_ALLOWED",
    );

    const audit = db.prepare("SELECT payload_json FROM audit_logs WHERE entity_id = ? AND action = 'settled'").get(finalEntry.id);
    assert.deepEqual(
      {
        settlement_completion: JSON.parse(audit.payload_json).settlement_completion,
        difference_cents: JSON.parse(audit.payload_json).difference_cents,
        closes_entry: JSON.parse(audit.payload_json).closes_entry,
      },
      { settlement_completion: "FINAL", difference_cents: 2000, closes_entry: true },
    );
  });

  it("quita receita abaixo do previsto e preserva a decisão após edição", () => {
    const fixture = createFinancialFixture({ entryType: "INCOME" });
    const entry = createEntry(fixture, { entry_type: "INCOME" });
    const received = Entry.settle(fixture.user, entry.id, settlement(fixture, {
      principal: "95,00",
      settlement_completion: "FINAL",
    }));

    assert.equal(received.status, "RECEIVED");
    assert.equal(received.realized_amount_cents, 9500);

    const edited = Entry.update(fixture.user, entry.id, {
      entry_type: "INCOME",
      description: "Receita ajustada",
      category_id: fixture.categoryId,
      financial_account_id: fixture.accountId,
      expected_amount: "100,00",
      realized_amount: "95,00",
      competence_month: "2026-07",
      due_date: "2999-07-10",
      party_name: "",
      notes: "",
    });

    assert.equal(edited.status, "RECEIVED");
    assert.equal(edited.has_active_closing_settlement, 1);
  });

  it("reabre lançamento ao estornar a baixa que quitou abaixo do previsto", () => {
    const fixture = createFinancialFixture();
    const entry = createEntry(fixture);
    Entry.settle(fixture.user, entry.id, settlement(fixture, {
      principal: "80,00",
      settlement_completion: "FINAL",
    }));
    const item = db.prepare("SELECT * FROM settlements WHERE financial_entry_id = ?").get(entry.id);

    const reopened = Entry.reverseSettlement(fixture.user, item.id, {
      reason: "Conta reaberta para correção",
      confirm_reversal: "yes",
    });

    assert.equal(reopened.realized_amount_cents, 0);
    assert.equal(reopened.status, "PENDING");
    assert.equal(reopened.has_active_closing_settlement, 0);
  });

  it("mantém quitação enquanto outra baixa parcial é estornada", () => {
    const fixture = createFinancialFixture();
    const entry = createEntry(fixture);
    Entry.settle(fixture.user, entry.id, settlement(fixture, { principal: "20,00" }));
    Entry.settle(fixture.user, entry.id, settlement(fixture, {
      principal: "70,00",
      settlement_completion: "FINAL",
    }));
    const partial = db.prepare("SELECT * FROM settlements WHERE financial_entry_id = ? AND closes_entry = 0").get(entry.id);

    const updated = Entry.reverseSettlement(fixture.user, partial.id, {
      reason: "Remover parcela anterior",
      confirm_reversal: "yes",
    });

    assert.equal(updated.realized_amount_cents, 7000);
    assert.equal(updated.status, "PAID");
    assert.equal(updated.has_active_closing_settlement, 1);
  });

  it("migration de encerramento preserva settlements existentes", () => {
    const legacy = new DatabaseSync(":memory:");
    try {
      legacy.exec(`
        CREATE TABLE settlements (
          id TEXT PRIMARY KEY,
          financial_entry_id TEXT NOT NULL,
          total_cents INTEGER NOT NULL
        );
        INSERT INTO settlements (id, financial_entry_id, total_cents)
        VALUES ('set-legacy', 'entry-legacy', 8000);
      `);

      settlementClosureMigration.up(legacy);
      settlementClosureMigration.up(legacy);

      const columns = legacy.prepare("PRAGMA table_info(settlements)").all();
      assert.ok(columns.some((column) => column.name === "closes_entry"));
      assert.equal(legacy.prepare("SELECT closes_entry FROM settlements WHERE id = 'set-legacy'").get().closes_entry, 0);
    } finally {
      legacy.close();
    }
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

  it("reverte exclusão mensal quando a auditoria falha", () => {
    const fixture = createFinancialFixture();
    const entry = createEntry(fixture);
    db.exec("CREATE TRIGGER fail_month_delete_audit BEFORE INSERT ON audit_logs WHEN NEW.action = 'month_deleted' BEGIN SELECT RAISE(ABORT, 'month audit failure'); END;");

    assert.throws(
      () => Entry.deleteMonth(fixture.user, {
        competence_month: "2026-07",
        confirmation: "2026-07",
        acknowledge_impact: "on",
      }),
      /month audit failure/
    );
    assert.equal(db.isTransaction, false);
    assert.equal(db.prepare("SELECT deleted_at FROM financial_entries WHERE id = ?").get(entry.id).deleted_at, null);
    db.exec("DROP TRIGGER fail_month_delete_audit;");
  });

  it("preserva o último administrador e encerra retornos funcionais", () => {
    const fixture = createFinancialFixture({ user: { isAdmin: true } });

    const blocked = User.setActiveAdmin("outro-ator", fixture.user.id, false);
    assert.deepEqual(blocked, { ok: false, reason: "last-admin" });
    assert.equal(db.isTransaction, false);
    assert.equal(db.prepare("SELECT is_active FROM users WHERE id = ?").get(fixture.user.id).is_active, 1);

    const missing = User.updateAdmin(fixture.user.id, "usuario-inexistente", {});
    assert.deepEqual(missing, { ok: false, notFound: true });
    assert.equal(db.isTransaction, false);
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

  it("reverte geração recorrente quando a auditoria falha", () => {
    const fixture = createFinancialFixture();
    Recurrence.create(fixture.user, {
      description: "Recorrência com falha", category_id: fixture.categoryId,
      financial_account_id: fixture.accountId, expected_amount: "50,00", due_day: "10",
      start_competence_month: "2026-07", end_competence_month: "2026-07", status: "ACTIVE",
    });
    db.exec("CREATE TRIGGER fail_recurrence_audit BEFORE INSERT ON audit_logs WHEN NEW.action = 'recurrence_generated' BEGIN SELECT RAISE(ABORT, 'recurrence audit failure'); END;");

    assert.throws(
      () => Recurrence.generateForCompetence(fixture.user, "2026-07"),
      /recurrence audit failure/
    );
    assert.equal(db.isTransaction, false);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_entries").get().total, 0);
    db.exec("DROP TRIGGER fail_recurrence_audit;");
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
