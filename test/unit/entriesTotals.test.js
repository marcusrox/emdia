const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { formatMoney } = require("../../src/services/moneyService");
const { entriesTable } = require("../../src/views/entriesView");

function entry(overrides = {}) {
  return {
    id: "entry-1",
    due_date: "2026-07-31",
    description: "Lançamento",
    entry_type: "EXPENSE",
    category_name: "Categoria",
    financial_account_name: "Conta",
    expected_amount_cents: 0,
    realized_amount_cents: 0,
    active_settlement_count: 0,
    status: "PENDING",
    ...overrides,
  };
}

describe("totalizador da listagem de lançamentos", () => {
  it("separa os valores previsto e realizado de receitas e despesas", () => {
    const html = entriesTable([
      entry({ expected_amount_cents: 12550, realized_amount_cents: 10000 }),
      entry({ id: "entry-2", expected_amount_cents: 7450, realized_amount_cents: 2500 }),
      entry({ id: "entry-3", entry_type: "INCOME", expected_amount_cents: 10000, realized_amount_cents: 8000 }),
      entry({ id: "entry-4", entry_type: "INCOME", expected_amount_cents: 5000, realized_amount_cents: 4000 }),
    ]);

    assert.match(html, /entries-total-row/);
    assert.match(html, /class="entry-value-cell" colspan="2"/);
    assert.match(html, /entries-total-group positive/);
    assert.match(html, /entries-total-group negative/);
    assert.equal(html.split(formatMoney(15000)).length - 1, 2);
    assert.equal(html.split(formatMoney(12000)).length - 1, 2);
    assert.equal(html.split(formatMoney(20000)).length - 1, 2);
    assert.equal(html.split(formatMoney(12500)).length - 1, 2);
    assert.match(html, /entries-mobile-totals/);
  });

  it("não adiciona o totalizador à tabela compacta do dashboard", () => {
    const html = entriesTable([entry({ expected_amount_cents: 1000 })], { compact: true });

    assert.ok(!html.includes("entries-total-row"));
    assert.ok(!html.includes("entries-mobile-totals"));
  });
});
