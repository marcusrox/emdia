const fs = require("node:fs");
const path = require("node:path");

const LUCIDE_ICONS_PATH = path.join(path.dirname(require.resolve("lucide-static/package.json")), "icons");
const LUCIDE_ICON_CACHE = new Map();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? " selected" : ""}>${escapeHtml(label)}</option>`;
}

function moneyInput(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2).replace(".", ",");
}

function fieldError(errors, field) {
  const message = errors?.[field];
  if (!message) return "";

  return `<small class="field-error" id="${escapeHtml(field)}-error">${escapeHtml(message)}</small>`;
}

function fieldErrorAttributes(errors, field) {
  if (!errors?.[field]) return "";

  return ` aria-invalid="true" aria-describedby="${escapeHtml(field)}-error"`;
}

function fieldLabel(label, helpText = "") {
  const help = helpText
    ? `<details class="field-help">
        <summary aria-label="Ajuda sobre ${escapeHtml(label)}">?</summary>
        <span class="field-help-popover">${escapeHtml(helpText)}</span>
      </details>`
    : "";

  return `<span class="field-label-row"><span>${escapeHtml(label)}</span>${help}</span>`;
}

const ACCOUNT_TYPE_OPTIONS = [
  ["CHECKING", "Conta corrente"],
  ["SAVINGS", "Poupança"],
  ["CASH", "Dinheiro"],
  ["DIGITAL_WALLET", "Carteira digital"],
  ["CREDIT_CARD", "Cartão de crédito"],
  ["OTHER", "Outro"],
];

const ACCOUNT_TYPE_LABELS = Object.fromEntries(ACCOUNT_TYPE_OPTIONS);

const ENTRY_TYPE_OPTIONS = [
  ["EXPENSE", "Despesa"],
  ["INCOME", "Receita"],
  ["BOTH", "Ambos"],
];

const ENTRY_TYPE_LABELS = Object.fromEntries(ENTRY_TYPE_OPTIONS);

const FONT_SCALE_OPTIONS = [
  ["small", "Pequena", "Mais informações visíveis em telas menores."],
  ["medium", "Padrão", "Tamanho atual da interface."],
  ["large", "Grande", "Leitura mais confortável."],
];

const FONT_SCALE_VALUES = new Set(FONT_SCALE_OPTIONS.map(([value]) => value));

const LIST_DENSITY_OPTIONS = [
  ["comfortable", "Confortável", "Mais espaço entre linhas para leitura tranquila."],
  ["standard", "Padrão", "Equilíbrio atual entre leitura e quantidade de informação."],
  ["compact", "Compacta", "Reduz espaços para mostrar mais registros na tela."],
];

const LIST_DENSITY_VALUES = new Set(LIST_DENSITY_OPTIONS.map(([value]) => value));

function accountTypeLabel(type) {
  return ACCOUNT_TYPE_LABELS[type] || type || "-";
}

function entryTypeLabel(type) {
  return ENTRY_TYPE_LABELS[type] || type || "-";
}

function categoryOptionLabel(category) {
  return `${category.name} (${entryTypeLabel(category.entry_type)})`;
}

function normalizeFontScale(value) {
  return FONT_SCALE_VALUES.has(value) ? value : "medium";
}

function normalizeListDensity(value) {
  return LIST_DENSITY_VALUES.has(value) ? value : "standard";
}

function csrfInput(user) {
  return `<input type="hidden" name="_csrf" value="${escapeHtml(user?.csrfToken || "")}">`;
}

function lucideIcon(name) {
  if (!LUCIDE_ICON_CACHE.has(name)) {
    const filePath = path.join(LUCIDE_ICONS_PATH, `${name}.svg`);
    const svg = fs
      .readFileSync(filePath, "utf8")
      .replace(/<!--[\s\S]*?-->\s*/g, "")
      .replace("<svg", '<svg aria-hidden="true" focusable="false"');

    LUCIDE_ICON_CACHE.set(name, svg);
  }

  return LUCIDE_ICON_CACHE.get(name);
}

function buttonContent(label, iconName = "") {
  const icon = iconName ? lucideIcon(iconName) : "";

  return `${icon}<span>${escapeHtml(label)}</span>`;
}

function buttonLink({ href, label, icon = "", tone = "secondary", className = "" }) {
  const toneClass = tone === "primary" ? "primary-button" : "ghost-button";
  const classes = [toneClass, className].filter(Boolean).join(" ");

  return `<a class="${classes}" href="${escapeHtml(href)}">${buttonContent(label, icon)}</a>`;
}

function pageHeading({ eyebrow = "", title, description = "", icon = "", actions = "", className = "" }) {
  const actionHtml = String(actions || "").trim();
  const iconHtml = icon ? `<span class="page-heading-icon" aria-hidden="true">${lucideIcon(icon)}</span>` : "";
  const classes = ["page-heading", actionHtml ? "page-heading-with-actions" : "", className]
    .filter(Boolean)
    .join(" ");

  return `<section class="${escapeHtml(classes)}">
    <div class="page-heading-main">
      ${iconHtml}
      <div class="page-heading-content">
        ${eyebrow ? `<span class="eyebrow">${escapeHtml(eyebrow)}</span>` : ""}
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      </div>
    </div>
    ${actionHtml ? `<div class="page-heading-actions">${actionHtml}</div>` : ""}
  </section>`;
}

function normalizeNotifications(notifications = []) {
  return notifications
    .filter(Boolean)
    .map((notification) => {
      if (typeof notification === "string") {
        return { type: "info", message: notification };
      }

      return {
        type: notification.type || "info",
        message: notification.message || "",
      };
    })
    .filter((notification) => notification.message);
}

function renderNotifications(notifications = []) {
  const items = normalizeNotifications(notifications);

  if (!items.length) {
    return "";
  }

  return `<div class="notification-stack" aria-live="polite">
    ${items.map((notification) => {
      const type = ["error", "success", "warning", "info"].includes(notification.type) ? notification.type : "info";
      const role = type === "error" ? "alert" : "status";

      return `<div class="notification notification-${type}" role="${role}">
        <p>${escapeHtml(notification.message)}</p>
        <button type="button" class="notification-close" aria-label="Fechar mensagem">X</button>
      </div>`;
    }).join("")}
  </div>`;
}

module.exports = {
  ACCOUNT_TYPE_OPTIONS,
  ENTRY_TYPE_OPTIONS,
  FONT_SCALE_OPTIONS,
  LIST_DENSITY_OPTIONS,
  accountTypeLabel,
  buttonContent,
  buttonLink,
  categoryOptionLabel,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  fieldError,
  fieldErrorAttributes,
  fieldLabel,
  lucideIcon,
  moneyInput,
  normalizeFontScale,
  normalizeListDensity,
  option,
  pageHeading,
  renderNotifications,
};
