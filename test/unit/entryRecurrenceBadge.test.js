const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { entriesTable } = require("../../src/views/entriesView");

function entry(overrides = {}) {
  return {
    id: "entry-1",
    due_date: "2026-08-10",
    description: "Internet residencial",
    entry_type: "EXPENSE",
    category_name: "Internet",
    financial_account_name: "Conta corrente",
    expected_amount_cents: 11990,
    realized_amount_cents: 0,
    active_settlement_count: 0,
    status: "PENDING",
    ...overrides,
  };
}

describe("identificação de lançamentos recorrentes", () => {
  it("exibe badge clicável na tabela e no cartão mobile", () => {
    const html = entriesTable([entry({
      recurrence_rule_id: "rec-1",
      recurrence_description: "Internet & mensal",
    })]);

    assert.equal(html.match(/class="entry-recurrence-badge"/g)?.length, 2);
    assert.equal(html.match(/href="\/recurrences\/rec-1\/edit"/g)?.length, 2);
    assert.equal(html.match(/lucide-repeat-2/g)?.length, 2);
    assert.ok(!html.includes("<span>Recorrente</span>"));
    assert.match(html, /aria-label="Editar recorrência Internet &amp; mensal"/);
  });

  it("não cria badge para lançamento manual e preserva a tabela compacta", () => {
    const manualHtml = entriesTable([entry()]);
    const compactHtml = entriesTable([entry({ recurrence_rule_id: "rec-1" })], { compact: true });

    assert.ok(!manualHtml.includes("entry-recurrence-badge"));
    assert.ok(!compactHtml.includes("entry-recurrence-badge"));
    assert.match(compactHtml, /Despesa · Recorrente/);
  });
});
