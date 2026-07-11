const {
  ENTRY_TYPE_OPTIONS,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  option,
} = require("../services/viewHelpers");
const { layout } = require("./layout");

function categoriesView({ user, categories }) {
  return layout({
    title: "Categorias",
    user,
    active: "/categories",
    body: `
      <section class="page-heading"><span class="eyebrow">Cadastros</span><h1>Categorias</h1></section>
      <section class="split compact-crud">
        <form method="post" action="/categories" class="panel form-grid form-compact form-short">
          ${csrfInput(user)}
          <label>Nome<input name="name" required></label>
          <label>Tipo
            <select name="entry_type">
              ${ENTRY_TYPE_OPTIONS.map(([value, label]) => option(value, label, "")).join("")}
            </select>
          </label>
          <label>Cor<input type="color" name="color" value="#0f766e"></label>
          <button type="submit">Adicionar categoria</button>
        </form>
        <article class="panel"><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th></tr></thead><tbody>
          ${categories.map((category) => `<tr><td>${escapeHtml(category.name)}</td><td>${escapeHtml(entryTypeLabel(category.entry_type))}</td></tr>`).join("")}
        </tbody></table></div></article>
      </section>
    `,
  });
}

module.exports = {
  categoriesView,
};
