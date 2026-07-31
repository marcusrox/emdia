const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  addMonths,
  dueDateFromCompetence,
  formatCivilDate,
  isCompetence,
  normalizeCompetence,
} = require("../../src/services/dateService");
const { formatMoney, toCents } = require("../../src/services/moneyService");
const { deriveStatus, settlementEligibility } = require("../../src/services/statusService");
const { csvCell, entriesCsv, neutralizeFormula } = require("../../src/services/csvService");

describe("serviços financeiros", () => {
  it("serializa CSV em UTF-8 e neutraliza fórmulas", () => {
    assert.equal(neutralizeFormula("=1+1"), "'=1+1");
    assert.equal(neutralizeFormula("  @comando"), "'  @comando");
    assert.equal(csvCell('texto; "citado"'), '"texto; ""citado"""');
    const csv = entriesCsv([{
      id: "ent_1",
      description: "+Fórmula",
      competence_month: "2026-07",
      due_date: "2026-07-10",
    }]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.match(csv, /Quantidade de baixas vigentes/);
    assert.match(csv, /'\+Fórmula/);
    assert.match(csv, /10\/07\/2026/);
  });

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

  it("apresenta datas civis no padrão brasileiro sem alterar o formato de persistência", () => {
    assert.equal(formatCivilDate("2026-08-10"), "10/08/2026");
    assert.equal(formatCivilDate("2024-02-29"), "29/02/2024");
    assert.equal(formatCivilDate("2025-02-29"), "-");
    assert.equal(formatCivilDate("2026-08", "original"), "original");
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
    assert.equal(deriveStatus({ ...base, entry_type: "EXPENSE", realized_amount_cents: 8000, has_active_closing_settlement: 1 }), "PAID");
    assert.equal(deriveStatus({ ...base, entry_type: "INCOME", realized_amount_cents: 8000, has_active_closing_settlement: 1 }), "RECEIVED");
    assert.equal(deriveStatus({ ...base, entry_type: "EXPENSE", realized_amount_cents: 0, due_date: "2000-01-01" }), "OVERDUE");
    assert.equal(deriveStatus({ ...base, entry_type: "EXPENSE", realized_amount_cents: 0, status: "CANCELLED" }), "CANCELLED");
  });

  it("bloqueia baixas incompatíveis", () => {
    for (const status of ["PAID", "RECEIVED", "CANCELLED", "DRAFT"]) {
      assert.equal(settlementEligibility({ status, expected_amount_cents: 100, realized_amount_cents: 0 }).allowed, false);
    }
    assert.equal(settlementEligibility({ status: "PENDING", expected_amount_cents: 100, realized_amount_cents: 100 }).allowed, false);
    assert.equal(settlementEligibility({
      status: "PARTIALLY_PAID",
      expected_amount_cents: 100,
      realized_amount_cents: 80,
      has_active_closing_settlement: 1,
    }).allowed, false);
    assert.equal(settlementEligibility({ status: "PENDING", expected_amount_cents: 100, realized_amount_cents: 0 }).allowed, true);
  });
});
