const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  CATEGORY_COLOR_OPTIONS,
  DEFAULT_CATEGORY_COLOR,
  isCategoryPaletteColor,
  normalizeCategoryColor,
  validCategoryColor,
} = require("../../src/services/categoryColorService");
const { categoriesView } = require("../../src/views/categoriesView");

const user = {
  displayName: "Teste",
  timezone: "America/Sao_Paulo",
  csrfToken: "token",
};

function renderForm(category = null) {
  return categoriesView({ user, categories: [], category });
}

describe("paleta de cores de categorias", () => {
  it("mantém doze opções únicas e o verde-petróleo como padrão", () => {
    assert.equal(CATEGORY_COLOR_OPTIONS.length, 12);
    assert.equal(new Set(CATEGORY_COLOR_OPTIONS.map(({ value }) => value)).size, 12);
    assert.equal(DEFAULT_CATEGORY_COLOR, "#0F766E");
    assert.equal(isCategoryPaletteColor("#0f766e"), true);
  });

  it("normaliza hexadecimal válido e rejeita valores livres inválidos", () => {
    assert.equal(validCategoryColor(" #123abc "), "#123ABC");
    assert.equal(validCategoryColor("red"), null);
    assert.equal(normalizeCategoryColor("red"), DEFAULT_CATEGORY_COLOR);
  });
});

describe("formulário visual de categorias", () => {
  it("preserva o select nativo e renderiza o seletor Lucide aprimorado", () => {
    const html = renderForm({
      id: "category-1",
      name: "Internet",
      entry_type: "EXPENSE",
      icon: "wifi",
      color: "#2563eb",
    });

    assert.match(html, /<select id="category-icon-select" name="icon"[^>]+data-category-icon-native>/);
    assert.match(html, /<option value="wifi" selected>Internet<\/option>/);
    assert.match(html, /role="combobox"/);
    assert.match(html, /role="listbox"/);
    assert.match(html, /data-category-icon-option data-value="wifi"/);
    assert.match(html, /lucide-wifi/);
  });

  it("renderiza somente as doze cores da paleta para uma categoria nova", () => {
    const html = renderForm();
    const colorInputs = html.match(/type="radio" name="color"/g) || [];

    assert.equal(colorInputs.length, 12);
    assert.match(html, /value="#0F766E" checked/);
    assert.match(html, />Vermelho<\/span>/);
    assert.match(html, />Amarelo<\/span>/);
    assert.match(html, />Azul<\/span>/);
    assert.match(html, />Ciano<\/span>/);
    assert.match(html, />Marrom<\/span>/);
    assert.ok(!html.includes('type="color"'));
    assert.ok(!html.includes("style="));
  });

  it("preserva uma cor legada válida até que outra opção seja escolhida", () => {
    const html = renderForm({
      id: "category-legacy",
      name: "Legada",
      entry_type: "BOTH",
      icon: "tag",
      color: "#123abc",
    });
    const colorInputs = html.match(/type="radio" name="color"/g) || [];

    assert.equal(colorInputs.length, 13);
    assert.match(html, /value="#123ABC" checked/);
    assert.match(html, /<rect width="1" height="1" fill="#123ABC">/);
    assert.match(html, /Cor atual <small>#123ABC<\/small>/);
    assert.ok(!html.includes('value="#0F766E" checked'));
  });
});
