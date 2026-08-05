const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { actionButton, buttonLink } = require("../../src/services/viewHelpers");

const viewsDirectory = path.resolve(__dirname, "../../src/views");
const recognizedButtonComponents = new Set([
  "button",
  "category-icon-picker-option",
  "category-icon-picker-trigger",
  "icon-button",
  "notification-close",
  "record-action-button",
  "toolbar-icon-button",
  "user-menu-item",
]);

test("renderiza ações comuns com componente e variante explícitos", () => {
  assert.match(
    actionButton({ label: "Salvar", icon: "save" }),
    /^<button class="button button--primary" type="submit">[\s\S]*<span>Salvar<\/span><\/button>$/,
  );
  assert.match(
    actionButton({ label: "Cancelar", type: "button", tone: "secondary", attributes: { "data-close": true } }),
    /^<button class="button button--secondary" type="button" data-close>/,
  );
  assert.match(
    buttonLink({ href: "/entries", label: "Voltar", tone: "danger" }),
    /^<a class="button button--danger" href="\/entries">/,
  );
});

test("rejeita variantes e atributos não reconhecidos", () => {
  assert.throws(() => actionButton({ label: "Teste", tone: "informal" }), /Variante de botão inválida/);
  assert.throws(() => actionButton({ label: "Teste", type: "send" }), /Tipo de botão inválido/);
  assert.throws(() => actionButton({ label: "Teste", attributes: { onclick: "alert(1)" } }), /Atributo de botão inválido/);
});

test("views não declaram botões sem um componente reconhecido", () => {
  const failures = [];
  const files = fs.readdirSync(viewsDirectory).filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const source = fs.readFileSync(path.join(viewsDirectory, file), "utf8");
    const openings = source.match(/<button\b[^>]*>/g) || [];

    for (const opening of openings) {
      const classes = opening.match(/\bclass="([^"]+)"/)?.[1].split(/\s+/) || [];
      if (!classes.some((className) => recognizedButtonComponents.has(className))) {
        failures.push(`${file}: ${opening}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});
