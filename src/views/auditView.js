const { layout } = require("./layout");
const { buttonContent, escapeHtml, option } = require("../services/viewHelpers");

const ENTITY_OPTIONS = [
  ["financial_entry", "Lançamento"],
  ["settlement", "Baixa"],
  ["recurrence", "Recorrência"],
  ["financial_account", "Conta financeira"],
  ["category", "Categoria"],
  ["user", "Usuário"],
  ["settings", "Configurações"],
];

const ACTION_OPTIONS = [
  ["created", "Criado"],
  ["updated", "Editado"],
  ["deleted", "Arquivado"],
  ["restored", "Restaurado"],
  ["cancelled", "Cancelado"],
  ["settled", "Baixado"],
  ["reversed", "Estornado"],
  ["paused", "Pausado"],
  ["activated", "Ativado"],
  ["ended", "Encerrado"],
  ["duplicated", "Duplicado"],
  ["recurrence_generated", "Gerado por recorrência"],
  ["profile_updated", "Perfil atualizado"],
  ["settings_updated", "Preferências atualizadas"],
];

const ENTITY_LABELS = Object.fromEntries(ENTITY_OPTIONS);
const ACTION_LABELS = Object.fromEntries(ACTION_OPTIONS);

function auditView({ user, entries, filters }) {
  return layout({
    title: "Auditoria",
    user,
    active: "/audit",
    body: `
      <section class="page-heading">
        <span class="eyebrow">Histórico funcional</span>
        <h1>Auditoria</h1>
        <p>A auditoria mostra ações relevantes registradas no sistema.</p>
      </section>
      <section class="toolbar">
        <form method="get" action="/audit" class="filters audit-filters">
          <label>De
            <input type="date" name="from_date" value="${escapeHtml(filters.from_date || "")}">
          </label>
          <label>Até
            <input type="date" name="to_date" value="${escapeHtml(filters.to_date || "")}">
          </label>
          <select name="entity_type">
            ${option("", "Todas as entidades", filters.entity_type)}
            ${ENTITY_OPTIONS.map(([value, label]) => option(value, label, filters.entity_type)).join("")}
          </select>
          <select name="action">
            ${option("", "Todas as ações", filters.action)}
            ${ACTION_OPTIONS.map(([value, label]) => option(value, label, filters.action)).join("")}
          </select>
          <input name="q" value="${escapeHtml(filters.q || "")}" placeholder="Buscar no histórico">
          <div class="toolbar-actions">
            <button type="submit">${buttonContent("Filtrar", "filter")}</button>
            <a class="ghost-button" href="/audit">${buttonContent("Limpar", "eraser")}</a>
          </div>
        </form>
      </section>
      ${auditTable(entries)}
    `,
  });
}

function auditTable(entries) {
  if (!entries.length) {
    return `<div class="empty-state">Nenhum registro de auditoria encontrado.</div>`;
  }

  return `<div class="table-wrap">
    <table class="audit-table">
      <thead>
        <tr>
          <th>Data/hora</th>
          <th>Entidade</th>
          <th>Ação</th>
          <th>Identificador</th>
          <th>Usuário</th>
          <th>Resumo</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map((entry) => `<tr>
          <td>${escapeHtml(formatDateTime(entry.created_at))}</td>
          <td>${escapeHtml(entityLabel(entry.entity_type))}</td>
          <td>${escapeHtml(actionLabel(entry.action))}</td>
          <td><code>${escapeHtml(entry.entity_id)}</code></td>
          <td>${escapeHtml(entry.user_name || entry.user_email || "-")}</td>
          <td>${escapeHtml(payloadSummary(entry.payload_json))}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

function auditHistoryList(entries) {
  if (!entries.length) {
    return `<div class="empty-state">Nenhum evento de auditoria registrado.</div>`;
  }

  return `<ul class="settlement-list">
    ${entries.map((entry) => `<li>
      <span>${escapeHtml(formatDateTime(entry.created_at))} · ${escapeHtml(actionLabel(entry.action))}</span>
      <strong>${escapeHtml(payloadSummary(entry.payload_json))}</strong>
    </li>`).join("")}
  </ul>`;
}

function entityLabel(entityType) {
  return ENTITY_LABELS[entityType] || entityType || "-";
}

function actionLabel(action) {
  return ACTION_LABELS[action] || action || "-";
}

function payloadSummary(payloadJson) {
  const payload = parsePayload(payloadJson);
  if (!payload || typeof payload !== "object") return "-";

  const parts = Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${formatPayloadValue(value)}`);

  return parts.length ? parts.join(" · ") : "-";
}

function parsePayload(payloadJson) {
  if (!payloadJson) return null;

  try {
    return JSON.parse(payloadJson);
  } catch (error) {
    return { payload: "Registro legado inválido" };
  }
}

function formatPayloadValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

module.exports = {
  ACTION_OPTIONS,
  ENTITY_OPTIONS,
  actionLabel,
  auditHistoryList,
  auditView,
  entityLabel,
  payloadSummary,
};
