const { layout } = require("./layout");
const { buttonContent, escapeHtml, option } = require("../services/viewHelpers");
const { detailsSummary } = require("../services/operationalLogReader");

const LEVEL_OPTIONS = [
  ["info", "Informação"],
  ["warn", "Alerta"],
  ["error", "Erro"],
];

const LEVEL_LABELS = Object.fromEntries(LEVEL_OPTIONS);

function operationalLogsView({ user, entries, filters, dates }) {
  const latestTimestamp = entries.reduce((latest, entry) => {
    if (!entry.timestamp) return latest;
    return !latest || entry.timestamp > latest ? entry.timestamp : latest;
  }, "");

  return layout({
    title: "Logs operacionais",
    user,
    active: "/operational-logs",
    body: `
      <section class="page-heading operational-log-heading">
        <div>
          <span class="eyebrow">Eventos técnicos</span>
          <h1>Logs operacionais</h1>
          <p>Visualize eventos gravados em arquivo texto e acompanhe novos registros automaticamente.</p>
        </div>
        <div class="live-log-status" data-operational-log-status>
          <span class="live-dot" aria-hidden="true"></span>
          <strong>Leitura automática ativa</strong>
          <small>Atualizando a cada 5 segundos</small>
        </div>
      </section>
      <section class="toolbar">
        <form method="get" action="/operational-logs" class="filters operational-log-filters">
          <label>Arquivo
            <select name="date" data-auto-submit-on-change>
              ${dates.length ? dates.map((date) => option(date, `operacional-${date}.log`, filters.date)).join("") : option("", "Nenhum arquivo encontrado", "")}
            </select>
          </label>
          <label>Nível
            <select name="level" data-auto-submit-on-change>
              ${option("", "Todos os níveis", filters.level)}
              ${LEVEL_OPTIONS.map(([value, label]) => option(value, label, filters.level)).join("")}
            </select>
          </label>
          <label>Evento
            <input name="event" value="${escapeHtml(filters.event || "")}" placeholder="app.startup">
          </label>
          <label>Busca
            <input name="q" value="${escapeHtml(filters.q || "")}" placeholder="Mensagem, usuário, detalhe">
          </label>
          <label>Limite
            <input name="limit" value="${escapeHtml(filters.limit || 200)}" inputmode="numeric">
          </label>
          <div class="toolbar-actions">
            <button type="submit">${buttonContent("Filtrar", "filter")}</button>
            <a class="ghost-button" href="/operational-logs">${buttonContent("Limpar", "eraser")}</a>
          </div>
        </form>
      </section>
      <section
        class="operational-log-view"
        data-operational-logs
        data-latest-timestamp="${escapeHtml(latestTimestamp)}"
        data-api-url="${escapeHtml(logEventsUrl(filters))}"
      >
        ${operationalLogTable(entries)}
      </section>
    `,
  });
}

function operationalLogTable(entries) {
  if (!entries.length) {
    return `<div class="empty-state" data-operational-log-empty>Nenhum log operacional encontrado.</div>`;
  }

  return `<div class="table-wrap">
    <table class="operational-log-table">
      <thead>
        <tr>
          <th>Data/hora</th>
          <th>Nível</th>
          <th>Evento</th>
          <th>Mensagem</th>
          <th>Usuário</th>
          <th>Detalhes</th>
        </tr>
      </thead>
      <tbody data-operational-log-rows>
        ${entries.map(operationalLogRow).join("")}
      </tbody>
    </table>
  </div>`;
}

function operationalLogRow(entry) {
  return `<tr data-log-timestamp="${escapeHtml(entry.timestamp || "")}">
    <td class="log-time">${escapeHtml(formatDateTime(entry.timestamp))}<small>Linha ${escapeHtml(entry.lineNumber)}</small></td>
    <td><span class="level-badge level-${escapeHtml(entry.level)}">${escapeHtml(levelLabel(entry.level))}</span></td>
    <td><code>${escapeHtml(entry.event)}</code></td>
    <td>${escapeHtml(entry.message)}</td>
    <td>${escapeHtml(entry.username || entry.userId || "-")}</td>
    <td class="log-details">${escapeHtml(detailsSummary(entry.details) || "-")}</td>
  </tr>`;
}

function logEventsUrl(filters) {
  const params = new URLSearchParams();
  ["date", "level", "event", "q", "limit"].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });

  return `/operational-logs/events?${params.toString()}`;
}

function levelLabel(level) {
  return LEVEL_LABELS[level] || level || "-";
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

module.exports = {
  levelLabel,
  operationalLogRow,
  operationalLogsView,
};
