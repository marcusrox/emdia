const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { entryFormView } = require("../../src/views/entriesView");

const user = {
  displayName: "Teste",
  timezone: "America/Sao_Paulo",
  csrfToken: "token",
};

describe("formulário de lançamento financeiro", () => {
  it("apresenta o valor realizado como informação gerenciada pelas baixas", () => {
    const html = entryFormView({
      user,
      entry: {
        id: "entry-1",
        description: "Conta de teste",
        entry_type: "EXPENSE",
        competence_month: "2026-08",
        due_date: "2026-08-10",
        expected_amount_cents: 10000,
        realized_amount_cents: 4000,
      },
      competence: "2026-08",
      categories: [],
      accounts: [],
      action: "/entries/entry-1",
    });

    assert.match(html, /Valor realizado pelas baixas/);
    assert.match(html, /<input class="field-readonly" value="40,00" readonly aria-readonly="true">/);
    assert.ok(!html.includes('name="realized_amount"'));
  });
});
