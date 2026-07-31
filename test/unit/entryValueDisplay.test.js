const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { formatMoney } = require("../../src/services/moneyService");
const { entryValueDisplay } = require("../../src/views/entriesView");

function entry(overrides = {}) {
  return {
    entry_type: "EXPENSE",
    expected_amount_cents: 100000,
    realized_amount_cents: 0,
    active_settlement_count: 0,
    status: "PENDING",
    ...overrides,
  };
}

describe("valor do lançamento nas listagens", () => {
  it("mostra o previsto enquanto não houver baixa vigente", () => {
    const html = entryValueDisplay(entry({ realized_amount_cents: 25000 }));

    assert.ok(html.includes(formatMoney(100000)));
    assert.ok(!html.includes(formatMoney(25000)));
    assert.match(html, />previsto</);
  });

  it("mostra realizado e previsto em uma baixa parcial", () => {
    const html = entryValueDisplay(entry({
      active_settlement_count: 1,
      realized_amount_cents: 60000,
      status: "PARTIALLY_PAID",
    }));

    assert.ok(html.includes(formatMoney(60000)));
    assert.ok(html.includes(`realizado de ${formatMoney(100000)} previsto`));
  });

  it("não repete o previsto quando a baixa corresponde ao valor esperado", () => {
    const html = entryValueDisplay(entry({
      active_settlement_count: 1,
      realized_amount_cents: 100000,
      status: "PAID",
    }));

    assert.equal(html.split(formatMoney(100000)).length - 1, 1);
    assert.match(html, />realizado</);
  });

  it("mantém o previsto como referência quando a quitação tem diferença", () => {
    const html = entryValueDisplay(entry({
      active_settlement_count: 1,
      realized_amount_cents: 95000,
      status: "PAID",
    }));

    assert.ok(html.includes(formatMoney(95000)));
    assert.ok(html.includes(`previsto ${formatMoney(100000)}`));
  });

  it("mostra o previsto riscado para lançamento cancelado", () => {
    const html = entryValueDisplay(entry({
      active_settlement_count: 1,
      realized_amount_cents: 60000,
      status: "CANCELLED",
    }));

    assert.match(html, /entry-value-cancelled/);
    assert.ok(html.includes(formatMoney(100000)));
    assert.ok(!html.includes(formatMoney(60000)));
    assert.match(html, />previsto</);
  });
});
