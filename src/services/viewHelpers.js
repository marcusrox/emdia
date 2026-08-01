const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { CATEGORY_ICON_OPTIONS, normalizeCategoryIcon } = require("./categoryIconService");

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

function gravatarUrl(email, { size = 80, name = "" } = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const hash = createHash("sha256").update(normalizedEmail).digest("hex");
  const normalizedSize = Math.min(2048, Math.max(1, Number.parseInt(size, 10) || 80));
  const params = new URLSearchParams({ d: "initials", r: "g", s: String(normalizedSize) });

  if (String(name || "").trim()) params.set("name", String(name).trim());

  return `https://gravatar.com/avatar/${hash}?${params.toString()}`;
}

function gravatarAvatar({ email, name, size = 80, className = "", loading = "lazy" }) {
  const classes = ["gravatar-avatar", className].filter(Boolean).join(" ");
  return `<img class="${escapeHtml(classes)}" src="${escapeHtml(gravatarUrl(email, { size, name }))}" alt="Avatar de ${escapeHtml(name || "usuário")}" width="${escapeHtml(size)}" height="${escapeHtml(size)}" loading="${loading === "eager" ? "eager" : "lazy"}" referrerpolicy="no-referrer">`;
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

function normalizeHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#0f766e";
}

function validHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : null;
}

function blendHexColor(hexColor, targetHexColor, targetWeight) {
  const sourceChannels = hexColor.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16));
  const targetChannels = targetHexColor.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16));

  return `#${sourceChannels
    .map((channel, index) => Math.round(channel * (1 - targetWeight) + targetChannels[index] * targetWeight)
      .toString(16)
      .padStart(2, "0"))
    .join("")}`;
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

function categoryIdentity({ name, icon, color } = {}, { appearance = "default" } = {}) {
  const categoryName = name || "Sem categoria";

  if (appearance === "badge") {
    const hasCategory = Boolean(String(name || "").trim());
    const normalizedIcon = hasCategory ? normalizeCategoryIcon(icon) : null;
    const normalizedColor = hasCategory ? validHexColor(color) : null;
    const identityIcon = normalizedIcon
      ? `<span class="entry-category-icon" aria-hidden="true">${lucideIcon(normalizedIcon)}</span>`
      : "";
    const badgeClass = normalizedColor ? "entry-category-badge" : "entry-category-badge entry-category-badge-neutral";
    const badgeBackground = normalizedColor
      ? `<svg class="entry-category-badge-background" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <rect width="1" height="1" fill="${blendHexColor(normalizedColor, "#ffffff", 0.84)}"></rect>
        </svg>`
      : "";
    const badgeText = normalizedColor
      ? `<svg class="entry-category-badge-text" aria-hidden="true" focusable="false">
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${blendHexColor(normalizedColor, "#000000", 0.55)}">${escapeHtml(categoryName)}</text>
        </svg>`
      : "";

    return `<span class="category-name-with-color entry-category-identity">${identityIcon}<span class="${badgeClass}">${badgeBackground}<span class="entry-category-badge-label"${normalizedColor ? ' aria-hidden="true"' : ""}>${escapeHtml(categoryName)}</span>${badgeText}${normalizedColor ? `<span class="sr-only">${escapeHtml(categoryName)}</span>` : ""}</span></span>`;
  }

  const normalizedIcon = normalizeCategoryIcon(icon);
  const normalizedColor = normalizeHexColor(color);
  const iconLabel = CATEGORY_ICON_OPTIONS.find(([value]) => value === normalizedIcon)?.[1] || "Ícone da categoria";
  const identityIcon = normalizedIcon
    ? `<span class="category-icon" title="${escapeHtml(iconLabel)}">
        <svg class="category-icon-circle" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <circle cx="16" cy="16" r="15" fill="${escapeHtml(normalizedColor)}"></circle>
        </svg>
        ${lucideIcon(normalizedIcon).replaceAll("currentColor", contrastColor(normalizedColor))}
      </span>`
    : icon || color
      ? `<svg class="category-color-dot" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="7" fill="${escapeHtml(normalizedColor)}"></circle>
        </svg>`
      : "";

  return `<span class="category-name-with-color">${identityIcon}<span>${escapeHtml(categoryName)}</span></span>`;
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
        <button type="button" class="notification-close" aria-label="Fechar mensagem">${lucideIcon("x")}</button>
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
  categoryIdentity,
  categoryOptionLabel,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  fieldError,
  fieldErrorAttributes,
  fieldLabel,
  gravatarAvatar,
  gravatarUrl,
  lucideIcon,
  moneyInput,
  normalizeFontScale,
  normalizeListDensity,
  option,
  pageHeading,
  renderNotifications,
};
