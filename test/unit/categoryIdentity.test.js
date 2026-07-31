const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { categoryIdentity } = require("../../src/services/viewHelpers");
const { entriesTable } = require("../../src/views/entriesView");
const { categoriesView } = require("../../src/views/categoriesView");
const { recurrencesListView } = require("../../src/views/recurrencesView");

function entryCategory(overrides = {}) {
  return categoryIdentity({
    name: "Alimentação",
    icon: "utensils",
    color: "#0f766e",
    ...overrides,
  }, { appearance: "badge" });
}

describe("identidade da categoria nas listagens de lançamentos", () => {
  it("renderiza ícone simples e badge com a cor cadastrada", () => {
    const html = entryCategory();

    assert.match(html, /entry-category-icon/);
    assert.match(html, /entry-category-badge/);
    assert.match(html, /<rect width="1" height="1" fill="#d9e9e8">/);
    assert.match(html, /<text[^>]+fill="#073531">Alimentação<\/text>/);
    assert.ok(!html.includes("style="));
    assert.ok(!html.includes("category-icon-circle"));
    assert.ok(!html.includes("category-color-dot"));
  });

  it("deriva fundo claro e texto escuro da mesma cor cadastrada", () => {
    const html = entryCategory({ color: "#fef3c7" });

    assert.match(html, /<rect width="1" height="1" fill="#fffdf6">/);
    assert.match(html, /<text[^>]+fill="#726d5a">Alimentação<\/text>/);
  });

  it("não cria marcador substituto quando não há ícone válido", () => {
    const html = entryCategory({ icon: "icone-invalido" });

    assert.ok(!html.includes("entry-category-icon"));
    assert.ok(!html.includes("category-color-dot"));
    assert.match(html, />Alimentação</);
  });

  it("usa badge neutro quando a cor é inválida", () => {
    const html = entryCategory({ color: "red" });

    assert.match(html, /entry-category-badge-neutral/);
    assert.ok(!html.includes('fill="red"'));
    assert.ok(!html.includes("entry-category-badge-background"));
    assert.ok(!html.includes("entry-category-badge-text"));
  });

  it("exibe Sem categoria sem ícone e com badge neutro", () => {
    const html = entryCategory({ name: null });

    assert.match(html, />Sem categoria</);
    assert.match(html, /entry-category-badge-neutral/);
    assert.ok(!html.includes("entry-category-icon"));
  });

  it("preserva a apresentação padrão usada por outras telas", () => {
    const html = categoryIdentity({
      name: "Alimentação",
      icon: "utensils",
      color: "#0f766e",
    });

    assert.match(html, /category-icon-circle/);
    assert.ok(!html.includes("entry-category-badge"));
  });

  it("aplica o badge à tabela e ao cartão mobile de lançamentos", () => {
    const entry = {
      id: "entry-1",
      due_date: "2026-07-30",
      description: "Supermercado",
      entry_type: "EXPENSE",
      category_name: "Alimentação",
      category_icon: "utensils",
      category_color: "#0f766e",
      financial_account_name: "Conta corrente",
      expected_amount_cents: 15000,
      realized_amount_cents: 0,
      active_settlement_count: 0,
      status: "PENDING",
    };
    const html = entriesTable([entry]);
    const compactHtml = entriesTable([entry], { compact: true });
    const badgePattern = /<span class="entry-category-badge(?:\s|")/g;

    assert.equal(html.match(badgePattern)?.length, 2);
    assert.equal(compactHtml.match(badgePattern)?.length, 1);
  });

  it("aplica o badge e o ícone simples à listagem de categorias", () => {
    const html = categoriesView({
      user: { displayName: "Teste", timezone: "America/Sao_Paulo", csrfToken: "token" },
      categories: [{
        id: "category-1",
        name: "Alimentação",
        icon: "utensils",
        color: "#dc2626",
        entry_type: "EXPENSE",
      }],
    });

    assert.match(html, /entry-category-icon/);
    assert.match(html, /entry-category-badge/);
    assert.match(html, /<rect width="1" height="1" fill="#f9dcdc">/);
    assert.ok(!html.includes("category-icon-circle"));
  });

  it("aplica o badge e o ícone simples à listagem de recorrências", () => {
    const html = recurrencesListView({
      user: { displayName: "Teste", timezone: "America/Sao_Paulo", csrfToken: "token" },
      recurrences: [{
        id: "recurrence-1",
        description: "Internet residencial",
        category_name: "Internet",
        category_icon: "wifi",
        category_color: "#0891b2",
        category_entry_type: "EXPENSE",
        expected_amount_cents: 11990,
        due_day: 10,
        start_competence_month: "2026-07",
        end_competence_month: null,
        status: "ACTIVE",
      }],
    });

    assert.match(html, /entry-category-icon/);
    assert.match(html, /entry-category-badge/);
    assert.match(html, /<rect width="1" height="1" fill="#d7edf3">/);
    assert.ok(!html.includes("category-icon-circle"));
  });
});
