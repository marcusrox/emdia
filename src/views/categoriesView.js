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
  archive: lucideIcon("archive"),
  edit: lucideIcon("pencil"),
  delete: lucideIcon("trash-2"),
  restore: lucideIcon("rotate-ccw"),
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
        <article class="panel">
          <div class="panel-heading">
            <h2>Categorias cadastradas</h2>
            <a class="record-action-button" href="/categories/deleted" title="Ver categorias arquivadas" aria-label="Ver categorias arquivadas">${ACTION_ICONS.archive}</a>
          </div>
          <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Ações</th></tr></thead><tbody>
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

function deletedCategoriesView({ user, categories }) {
  return layout({
    title: "Categorias arquivadas",
    user,
    active: "/categories",
    body: `
      <section class="page-heading"><span class="eyebrow">Cadastros</span><h1>Categorias arquivadas</h1></section>
      <div class="page-actions">
        <a class="ghost-button" href="/categories">Voltar para categorias ativas</a>
      </div>
      <article class="panel">${deletedCategoriesTable(categories, user)}</article>
    `,
  });
}

function deletedCategoriesTable(categories, user) {
  if (!categories.length) {
    return `<div class="empty-state">Nenhum item arquivado.</div>`;
  }

  return `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Arquivada em</th><th>Ações</th></tr></thead><tbody>
    ${categories.map((category) => `<tr>
      <td>${escapeHtml(category.name)}</td>
      <td>${escapeHtml(entryTypeLabel(category.entry_type))}</td>
      <td>${escapeHtml(formatArchivedAt(category.deleted_at, user.timezone))}</td>
      <td class="record-actions-cell">
        <div class="record-actions">
          ${recordActionForm({
            action: `/categories/${category.id}/restore`,
            icon: "restore",
            label: "Restaurar categoria",
            user,
          })}
        </div>
      </td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

function formatArchivedAt(value, timezone = "America/Bahia") {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

module.exports = {
  categoriesView,
  deletedCategoriesView,
};
