const {
  ENTRY_TYPE_OPTIONS,
  actionButton,
  buttonLink,
  categoryIdentity,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  lucideIcon,
  option,
  pageHeading,
} = require("../services/viewHelpers");
const {
  CATEGORY_COLOR_OPTIONS,
  DEFAULT_CATEGORY_COLOR,
  isCategoryPaletteColor,
  normalizeCategoryColor,
  validCategoryColor,
} = require("../services/categoryColorService");
const { CATEGORY_ICON_OPTIONS } = require("../services/categoryIconService");
const { layout } = require("./layout");

const ACTION_ICONS = {
  archive: lucideIcon("archive"),
  edit: lucideIcon("pencil"),
  delete: lucideIcon("trash-2"),
  restore: lucideIcon("rotate-ccw"),
};

const DELETE_CATEGORY_CONFIRM_MESSAGE =
  "Excluir esta categoria? Esta é uma exclusão lógica: a categoria sairá da lista principal, mas continuará existindo no sistema. Voce poderá reverter depois em Categorias arquivadas, usando a ação de restaurar.";

function categoryIconContent(value, label) {
  const icon = value
    ? `<span class="category-icon-picker-icon" aria-hidden="true">${lucideIcon(value)}</span>`
    : `<span class="category-icon-picker-icon category-icon-picker-icon-empty" aria-hidden="true">—</span>`;

  return `${icon}<span class="category-icon-picker-label">${escapeHtml(label)}</span>`;
}

function categoryIconPicker(selectedValue) {
  const selected = CATEGORY_ICON_OPTIONS.find(([value]) => value === selectedValue) || CATEGORY_ICON_OPTIONS[0];
  const listboxId = "category-icon-options";

  return `<div class="category-form-field">
    <span class="category-form-label" id="category-icon-label">Ícone</span>
    <div class="category-icon-picker" data-category-icon-picker>
      <select id="category-icon-select" name="icon" aria-labelledby="category-icon-label" data-category-icon-native>
        ${CATEGORY_ICON_OPTIONS.map(([value, label]) => option(value, label, selected[0])).join("")}
      </select>
      <div class="category-icon-picker-enhanced" data-category-icon-enhanced hidden>
        <button type="button" class="category-icon-picker-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${listboxId}" aria-labelledby="category-icon-label category-icon-current-label" data-category-icon-trigger>
          <span class="category-icon-picker-current" data-category-icon-current>${categoryIconContent(selected[0], selected[1])}</span>
          <span class="category-icon-picker-chevron" aria-hidden="true">${lucideIcon("chevron-down")}</span>
        </button>
        <div class="category-icon-picker-options" id="${listboxId}" role="listbox" aria-labelledby="category-icon-label" data-category-icon-options hidden>
          ${CATEGORY_ICON_OPTIONS.map(([value, label]) => `<button type="button" class="category-icon-picker-option" role="option" aria-selected="${value === selected[0] ? "true" : "false"}" tabindex="-1" data-category-icon-option data-value="${escapeHtml(value)}">
            ${categoryIconContent(value, label)}
          </button>`).join("")}
        </div>
      </div>
    </div>
    <span class="sr-only" id="category-icon-current-label">${escapeHtml(selected[1])}</span>
  </div>`;
}

function categoryColorOption({ value, label, className }, selectedColor) {
  const id = `category-color-${className}`;

  return `<label class="category-color-option" for="${id}">
    <input id="${id}" type="radio" name="color" value="${value}"${value === selectedColor ? " checked" : ""}>
    <span class="category-color-swatch category-color-swatch-${className}" aria-hidden="true"></span>
    <span>${escapeHtml(label)}</span>
  </label>`;
}

function legacyCategoryColorOption(color) {
  return `<label class="category-color-option category-color-option-legacy" for="category-color-current">
    <input id="category-color-current" type="radio" name="color" value="${escapeHtml(color)}" checked>
    <svg class="category-color-swatch" viewBox="0 0 1 1" aria-hidden="true" focusable="false"><rect width="1" height="1" fill="${escapeHtml(color)}"></rect></svg>
    <span>Cor atual <small>${escapeHtml(color)}</small></span>
  </label>`;
}

function categoryColorPicker(value) {
  const validColor = validCategoryColor(value);
  const selectedColor = normalizeCategoryColor(validColor || DEFAULT_CATEGORY_COLOR);
  const legacyOption = validColor && !isCategoryPaletteColor(validColor)
    ? legacyCategoryColorOption(validColor)
    : "";

  return `<fieldset class="category-color-picker wide">
    <legend>Cor</legend>
    <div class="category-color-options">
      ${legacyOption}
      ${CATEGORY_COLOR_OPTIONS.map((color) => categoryColorOption(color, selectedColor)).join("")}
    </div>
  </fieldset>`;
}

function recordActionLink({ href, icon, label, tone = "" }) {
  return `<a class="record-action-button ${tone}" href="${escapeHtml(href)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</a>`;
}

function recordActionForm({ action, icon, label, tone = "", user, confirmMessage = "" }) {
  const confirmAttribute = confirmMessage ? ` data-confirm="${escapeHtml(confirmMessage)}"` : "";

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
      ${pageHeading({ eyebrow: "Cadastros", title: isEdit ? "Editar categoria" : "Categorias", icon: "tags" })}
      <section class="split compact-crud">
        <form method="post" action="${escapeHtml(action)}" class="panel form-grid form-compact form-short">
          ${csrfInput(user)}
          <label>Nome<input name="name" value="${escapeHtml(category?.name || "")}" required></label>
          <label>Tipo
            <select name="entry_type">
              ${ENTRY_TYPE_OPTIONS.map(([value, label]) => option(value, label, category?.entry_type || "")).join("")}
            </select>
          </label>
          ${categoryIconPicker(category?.icon || "")}
          ${categoryColorPicker(category?.color)}
          <div class="form-actions wide">
            ${buttonLink({ href: isEdit ? "/categories" : "/dashboard", label: "Voltar", icon: "arrow-left" })}
            ${actionButton({ label: isEdit ? "Atualizar" : "Salvar", icon: isEdit ? "check" : "save" })}
          </div>
        </form>
        <article class="panel list-panel">
          <div class="panel-heading">
            <h2>Categorias cadastradas</h2>
            <a class="record-action-button" href="/categories/deleted" title="Ver categorias arquivadas" aria-label="Ver categorias arquivadas">${ACTION_ICONS.archive}</a>
          </div>
          <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th class="actions-cell">Ações</th></tr></thead><tbody>
          ${categories.map((category) => `<tr>
            <td>${categoryIdentity(category, { appearance: "badge" })}</td>
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
                  confirmMessage: DELETE_CATEGORY_CONFIRM_MESSAGE,
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
      ${pageHeading({
        eyebrow: "Cadastros",
        title: "Categorias arquivadas",
        icon: "tags",
        actions: buttonLink({ href: "/categories", label: "Voltar para categorias ativas", icon: "arrow-left" }),
      })}
      <article class="panel">${deletedCategoriesTable(categories, user)}</article>
    `,
  });
}

function deletedCategoriesTable(categories, user) {
  if (!categories.length) {
    return `<div class="empty-state">Nenhum item arquivado.</div>`;
  }

  return `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Arquivada em</th><th class="actions-cell">Ações</th></tr></thead><tbody>
    ${categories.map((category) => `<tr>
      <td>${categoryIdentity(category, { appearance: "badge" })}</td>
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
