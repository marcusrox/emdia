const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { addMonths, dueDateFromCompetence, isCompetence, normalizeCompetence } = require("../../src/services/dateService");
const { formatMoney, toCents } = require("../../src/services/moneyService");
const { deriveStatus, settlementEligibility } = require("../../src/services/statusService");

describe("serviços financeiros", () => {
  it("valida competência e usa o mês corrente como fallback", () => {
    assert.equal(isCompetence("2026-07"), true);
    assert.equal(isCompetence("2026-7"), false);
    assert.match(normalizeCompetence("inválida", "America/Sao_Paulo"), /^\d{4}-\d{2}$/);
  });

  it("navega entre anos e limita vencimento ao último dia válido", () => {
    assert.equal(addMonths("2026-12", 1), "2027-01");
    assert.equal(addMonths("2027-01", -1), "2026-12");
    assert.equal(dueDateFromCompetence("2024-02", 31), "2024-02-29");
    assert.equal(dueDateFromCompetence("2025-02", 31), "2025-02-28");
    assert.equal(dueDateFromCompetence("2026-04", 31), "2026-04-30");
  });

  it("converte e formata dinheiro", () => {
    assert.equal(toCents("1.234,56"), 123456);
    assert.equal(toCents("119,90"), 11990);
    assert.match(formatMoney(11990), /119,90/);
    assert.throws(() => toCents("abc"), /valor válido/i);
  });

  it("deriva os estados operacionais", () => {
    const base = { expected_amount_cents: 10000, due_date: "2999-01-01" };
    assert.equal(deriveStatus({ ...base, entry_type: "EXPENSE", realized_amount_cents: 0 }), "PENDING");
    assert.equal(deriveStatus({ ...base, entry_type: "EXPENSE", realized_amount_cents: 5000 }), "PARTIALLY_PAID");
    assert.equal(deriveStatus({ ...base, entry_type: "EXPENSE", realized_amount_cents: 10000 }), "PAID");
    assert.equal(deriveStatus({ ...base, entry_type: "INCOME", realized_amount_cents: 5000 }), "PARTIALLY_RECEIVED");
    assert.equal(deriveStatus({ ...base, entry_type: "INCOME", realized_amount_cents: 10000 }), "RECEIVED");
    assert.equal(deriveStatus({ ...base, entry_type: "EXPENSE", realized_amount_cents: 0, due_date: "2000-01-01" }), "OVERDUE");
    assert.equal(deriveStatus({ ...base, entry_type: "EXPENSE", realized_amount_cents: 0, status: "CANCELLED" }), "CANCELLED");
  });

  it("bloqueia baixas incompatíveis", () => {
    for (const status of ["PAID", "RECEIVED", "CANCELLED", "DRAFT"]) {
      assert.equal(settlementEligibility({ status, expected_amount_cents: 100, realized_amount_cents: 0 }).allowed, false);
    }
    assert.equal(settlementEligibility({ status: "PENDING", expected_amount_cents: 100, realized_amount_cents: 100 }).allowed, false);
    assert.equal(settlementEligibility({ status: "PENDING", expected_amount_cents: 100, realized_amount_cents: 0 }).allowed, true);
  });
});
