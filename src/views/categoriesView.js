const {
  ENTRY_TYPE_OPTIONS,
  buttonContent,
  buttonLink,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  lucideIcon,
  option,
  pageHeading,
} = require("../services/viewHelpers");
const { CATEGORY_ICON_OPTIONS, normalizeCategoryIcon } = require("../services/categoryIconService");
const { layout } = require("./layout");

const ACTION_ICONS = {
  archive: lucideIcon("archive"),
  edit: lucideIcon("pencil"),
  delete: lucideIcon("trash-2"),
  restore: lucideIcon("rotate-ccw"),
};

const DELETE_CATEGORY_CONFIRM_MESSAGE =
  "Excluir esta categoria? Esta é uma exclusão lógica: a categoria sairá da lista principal, mas continuará existindo no sistema. Voce poderá reverter depois em Categorias arquivadas, usando a ação de restaurar.";

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

function normalizeHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#0f766e";
}

function contrastColor(hexColor) {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;

  return whiteContrast >= blackContrast ? "#ffffff" : "#111827";
}

function categoryIdentity(category) {
  const color = normalizeHexColor(category.color);
  const icon = normalizeCategoryIcon(category.icon);
  const iconColor = contrastColor(color);
  const iconHtml = icon
    ? `<span class="category-icon" title="${escapeHtml(CATEGORY_ICON_OPTIONS.find(([value]) => value === icon)?.[1] || "Ícone da categoria")}">
        <svg class="category-icon-circle" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <circle cx="16" cy="16" r="15" fill="${escapeHtml(color)}"></circle>
        </svg>
        ${lucideIcon(icon).replaceAll("currentColor", iconColor)}
      </span>`
    : `<svg class="category-color-dot" viewBox="0 0 16 16" title="${escapeHtml(color)}" aria-label="Cor da categoria ${escapeHtml(color)}">
        <circle cx="8" cy="8" r="7" fill="${escapeHtml(color)}"></circle>
      </svg>`;

  return `<span class="category-name-with-color">
    ${iconHtml}
    <span>${escapeHtml(category.name)}</span>
  </span>`;
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
          <label>Ícone
            <select name="icon">
              ${CATEGORY_ICON_OPTIONS.map(([value, label]) => option(value, label, category?.icon || "")).join("")}
            </select>
          </label>
          <label>Cor<input type="color" name="color" value="${escapeHtml(category?.color || "#0f766e")}"></label>
          <div class="form-actions wide">
            ${buttonLink({ href: isEdit ? "/categories" : "/dashboard", label: "Voltar", icon: "arrow-left" })}
            <button type="submit">${buttonContent(isEdit ? "Atualizar" : "Salvar", isEdit ? "check" : "save")}</button>
          </div>
        </form>
        <article class="panel list-panel">
          <div class="panel-heading">
            <h2>Categorias cadastradas</h2>
            <a class="record-action-button" href="/categories/deleted" title="Ver categorias arquivadas" aria-label="Ver categorias arquivadas">${ACTION_ICONS.archive}</a>
          </div>
          <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th class="actions-cell">Ações</th></tr></thead><tbody>
          ${categories.map((category) => `<tr>
            <td>${categoryIdentity(category)}</td>
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
      <td>${categoryIdentity(category)}</td>
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
