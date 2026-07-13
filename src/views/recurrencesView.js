const { formatMoney } = require("../services/moneyService");
const {
  buttonContent,
  buttonLink,
  categoryOptionLabel,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  lucideIcon,
  moneyInput,
  option,
} = require("../services/viewHelpers");
const { currentCompetence } = require("../services/dateService");
const { layout } = require("./layout");

const STATUS_LABELS = {
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ENDED: "Encerrada",
};

const ACTION_ICONS = {
  edit: lucideIcon("pencil"),
  pause: lucideIcon("pause"),
  play: lucideIcon("play"),
  end: lucideIcon("circle-stop"),
};

function recurrencesListView({ user, recurrences }) {
  return layout({
    title: "Recorrências",
    user,
    active: "/recurrences",
    body: `
      <section class="page-heading">
        <span class="eyebrow">Regras mensais</span>
        <h1>Recorrências</h1>
      </section>
      <section class="toolbar">
        ${buttonLink({ href: "/recurrences/new", label: "Nova recorrência", icon: "plus", tone: "primary" })}
      </section>
      ${recurrencesTable(recurrences, user)}
    `,
  });
}

function recurrenceFormView({ user, recurrence, categories, accounts, action }) {
  const isEdit = Boolean(recurrence?.id);
  const selectedStart = recurrence?.start_competence_month || currentCompetence(user.timezone);

  return layout({
    title: isEdit ? "Editar recorrência" : "Nova recorrência",
    user,
    active: "/recurrences",
    body: `
      <section class="page-heading">
        <span class="eyebrow">${isEdit ? "Editar" : "Nova"}</span>
        <h1>${isEdit ? escapeHtml(recurrence.description) : "Recorrência mensal"}</h1>
      </section>
      <form method="post" action="${escapeHtml(action)}" class="form-grid form-compact panel">
        ${csrfInput(user)}
        <label class="field-span-2">Descrição
          <input name="description" value="${escapeHtml(recurrence?.description || "")}" required>
        </label>
        <label>Categoria
          <select name="category_id" required>
            ${option("", "Selecione", recurrence?.category_id)}
            ${categories.map((category) => option(category.id, categoryOptionLabel(category), recurrence?.category_id)).join("")}
          </select>
          <small>A categoria define se esta recorrência é receita ou despesa.</small>
        </label>
        <label>Valor previsto
          <input name="expected_amount" inputmode="decimal" value="${escapeHtml(moneyInput(recurrence?.expected_amount_cents))}" required>
        </label>
        <label>Dia de vencimento
          <input type="number" name="due_day" min="1" max="31" value="${escapeHtml(recurrence?.due_day || 10)}" required>
          <small>Quando o mês não tiver esse dia, será usado o último dia do mês.</small>
        </label>
        <label>Competência inicial
          <input type="month" name="start_competence_month" value="${escapeHtml(selectedStart)}" required>
        </label>
        <label>Competência final
          <input type="month" name="end_competence_month" value="${escapeHtml(recurrence?.end_competence_month || "")}">
        </label>
        <label>Status
          <select name="status">
            ${Object.entries(STATUS_LABELS).map(([value, label]) => option(value, label, recurrence?.status || "ACTIVE")).join("")}
          </select>
        </label>
        <label>Conta prevista
          <select name="financial_account_id">
            ${option("", "Sem conta", recurrence?.financial_account_id)}
            ${accounts.map((account) => option(account.id, account.name, recurrence?.financial_account_id)).join("")}
          </select>
        </label>
        <label>Favorecido/Pagador
          <input name="party_name" value="${escapeHtml(recurrence?.party_name || "")}">
        </label>
        <label class="field-span-2">Observações
          <textarea name="notes">${escapeHtml(recurrence?.notes || "")}</textarea>
        </label>
        <div class="form-actions wide">
          ${buttonLink({ href: "/recurrences", label: "Voltar", icon: "arrow-left" })}
          <button type="submit">${buttonContent("Salvar", "save")}</button>
        </div>
      </form>
    `,
  });
}

function recurrencesTable(recurrences, user) {
  if (!recurrences.length) {
    return `<div class="empty-state">Nenhuma recorrência cadastrada.</div>`;
  }

  return `<div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Valor</th>
          <th>Vencimento</th>
          <th>Vigência</th>
          <th>Status</th>
          <th class="actions-cell">Ações</th>
        </tr>
      </thead>
      <tbody>
        ${recurrences.map((recurrence) => `<tr>
          <td><strong>${escapeHtml(recurrence.description)}</strong></td>
          <td>
            ${escapeHtml(recurrence.category_name)}
            <small>${escapeHtml(entryTypeLabel(recurrence.category_entry_type))}</small>
          </td>
          <td class="${recurrence.category_entry_type === "INCOME" ? "positive" : "negative"}">${formatMoney(recurrence.expected_amount_cents)}</td>
          <td>Dia ${escapeHtml(recurrence.due_day)}</td>
          <td>${escapeHtml(recurrence.start_competence_month)}${recurrence.end_competence_month ? ` a ${escapeHtml(recurrence.end_competence_month)}` : " em diante"}</td>
          <td><span class="status">${escapeHtml(statusLabel(recurrence.status))}</span></td>
          <td class="record-actions-cell">
            <div class="record-actions">
              ${recordActionLink({
                href: `/recurrences/${recurrence.id}/edit`,
                icon: "edit",
                label: "Editar recorrência",
              })}
              ${
                recurrence.status === "ACTIVE"
                  ? recordActionForm({
                      action: `/recurrences/${recurrence.id}/pause`,
                      icon: "pause",
                      label: "Pausar recorrência",
                      user,
                    })
                  : recordActionForm({
                      action: `/recurrences/${recurrence.id}/activate`,
                      icon: "play",
                      label: "Ativar recorrência",
                      user,
                    })
              }
              ${recordActionForm({
                action: `/recurrences/${recurrence.id}/end`,
                icon: "end",
                label: "Encerrar recorrência",
                tone: "danger",
                user,
              })}
            </div>
          </td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

function recordActionLink({ href, icon, label, tone = "" }) {
  return `<a class="record-action-button ${tone}" href="${escapeHtml(href)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</a>`;
}

function recordActionForm({ action, icon, label, tone = "", user }) {
  return `<form class="record-action-form" method="post" action="${escapeHtml(action)}">
    ${csrfInput(user)}
    <button type="submit" class="record-action-button ${tone}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</button>
  </form>`;
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "-";
}

module.exports = {
  recurrenceFormView,
  recurrencesListView,
};
