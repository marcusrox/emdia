const {
  ENTRY_TYPE_OPTIONS,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  lucideIcon,
  option,
} = require("../services/viewHelpers");
const { layout } = require("./layout");

const ACTION_ICONS = {
  edit: lucideIcon("pencil"),
  delete: lucideIcon("trash-2"),
};

function recordActionLink({ href, icon, label, tone = "" }) {
  return `<a class="record-action-button ${tone}" href="${escapeHtml(href)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</a>`;
}

function recordActionForm({ action, icon, label, tone = "", user, confirmMessage = "" }) {
  const confirmAttribute = confirmMessage ? ` onsubmit="return confirm('${escapeHtml(confirmMessage)}')"` : "";

  return `<form class="record-action-form" method="post" action="${escapeHtml(action)}"${confirmAttribute}>
    ${csrfInput(user)}
    <button type="submit" class="record-action-button ${tone}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</button>
  </form>`;
}

function categoriesView({ user, categories, category = null, action = "/categories" }) {
  const isEdit = Boolean(category?.id);

  return layout({
    title: isEdit ? "Editar categoria" : "Categorias",
    user,
    active: "/categories",
    body: `
      <section class="page-heading"><span class="eyebrow">Cadastros</span><h1>${isEdit ? "Editar categoria" : "Categorias"}</h1></section>
      <section class="split compact-crud">
        <form method="post" action="${escapeHtml(action)}" class="panel form-grid form-compact form-short">
          ${csrfInput(user)}
          <label>Nome<input name="name" value="${escapeHtml(category?.name || "")}" required></label>
          <label>Tipo
            <select name="entry_type">
              ${ENTRY_TYPE_OPTIONS.map(([value, label]) => option(value, label, category?.entry_type || "")).join("")}
            </select>
          </label>
          <label>Cor<input type="color" name="color" value="${escapeHtml(category?.color || "#0f766e")}"></label>
          <div class="form-actions wide">
            <a class="ghost-button" href="${isEdit ? "/categories" : "/dashboard"}">Voltar</a>
            <button type="submit">${isEdit ? "Atualizar" : "Salvar"}</button>
          </div>
        </form>
        <article class="panel"><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Ações</th></tr></thead><tbody>
          ${categories.map((category) => `<tr>
            <td>${escapeHtml(category.name)}</td>
            <td>${escapeHtml(entryTypeLabel(category.entry_type))}</td>
            <td class="record-actions-cell">
              <div class="record-actions">
                ${recordActionLink({
                  href: `/categories/${category.id}/edit`,
                  icon: "edit",
                  label: "Editar categoria",
                })}
                ${recordActionForm({
                  action: `/categories/${category.id}/delete`,
                  icon: "delete",
                  label: "Excluir categoria",
                  tone: "danger",
                  user,
                  confirmMessage: "Excluir esta categoria?",
                })}
              </div>
            </td>
          </tr>`).join("")}
        </tbody></table></div></article>
      </section>
    `,
  });
}

module.exports = {
  categoriesView,
};
