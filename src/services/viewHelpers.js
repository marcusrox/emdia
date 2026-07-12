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

function csrfInput(user) {
  return `<input type="hidden" name="_csrf" value="${escapeHtml(user?.csrfToken || "")}">`;
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
  accountTypeLabel,
  categoryOptionLabel,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  moneyInput,
  normalizeFontScale,
  option,
  renderNotifications,
};
