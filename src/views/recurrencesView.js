const { formatMoney } = require("../services/moneyService");
const {
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

function recurrenceFormView({ user, recurrence, categories, accounts, action, errors = {} }) {
  const isEdit = Boolean(recurrence?.id);
  const selectedStart = recurrence?.start_competence_month || currentCompetence(user.timezone);
  const fieldValue = (field, fallback = "") => recurrence?.[field] ?? fallback;
  const expectedAmount = recurrence?.expected_amount ?? moneyInput(recurrence?.expected_amount_cents);

  return layout({
    title: isEdit ? "Editar recorrência" : "Nova recorrência",
    user,
    active: "/recurrences",
    body: `
      <section class="page-heading">
        <span class="eyebrow">${isEdit ? "Editar" : "Nova"}</span>
        <h1>${isEdit ? escapeHtml(recurrence.description) : "Recorrência mensal"}</h1>
      </section>
      <form method="post" action="${escapeHtml(action)}" class="form-grid form-compact panel" data-validate-form>
        ${csrfInput(user)}
        <label class="field-span-2">${fieldLabel("Descrição")}
          <input name="description" value="${escapeHtml(fieldValue("description"))}" required${fieldErrorAttributes(errors, "description")}>
          ${fieldError(errors, "description")}
        </label>
        <label>${fieldLabel("Categoria", "A categoria define se esta recorrência é receita ou despesa.")}
          <select name="category_id" required${fieldErrorAttributes(errors, "category_id")}>
            ${option("", "Selecione", fieldValue("category_id"))}
            ${categories.map((category) => option(category.id, categoryOptionLabel(category), fieldValue("category_id"))).join("")}
          </select>
          ${fieldError(errors, "category_id")}
        </label>
        <label>${fieldLabel("Valor previsto")}
          <input name="expected_amount" inputmode="decimal" value="${escapeHtml(expectedAmount)}" required data-validate-money data-error-message="Informe um valor válido, como 100,00."${fieldErrorAttributes(errors, "expected_amount")}>
          ${fieldError(errors, "expected_amount")}
        </label>
        <label>${fieldLabel("Dia de vencimento", "Quando o mês não tiver esse dia, será usado o último dia do mês.")}
          <input type="number" name="due_day" min="1" max="31" value="${escapeHtml(fieldValue("due_day", 10))}" required${fieldErrorAttributes(errors, "due_day")}>
          ${fieldError(errors, "due_day")}
        </label>
        <label>${fieldLabel("Competência inicial")}
          <input type="month" name="start_competence_month" value="${escapeHtml(selectedStart)}" required${fieldErrorAttributes(errors, "start_competence_month")}>
          ${fieldError(errors, "start_competence_month")}
        </label>
        <label>${fieldLabel("Competência final")}
          <input type="month" name="end_competence_month" value="${escapeHtml(fieldValue("end_competence_month"))}"${fieldErrorAttributes(errors, "end_competence_month")}>
          ${fieldError(errors, "end_competence_month")}
        </label>
        <label>${fieldLabel("Status")}
          <select name="status"${fieldErrorAttributes(errors, "status")}>
            ${Object.entries(STATUS_LABELS).map(([value, label]) => option(value, label, fieldValue("status", "ACTIVE"))).join("")}
          </select>
          ${fieldError(errors, "status")}
        </label>
        <label>${fieldLabel("Conta prevista")}
          <select name="financial_account_id"${fieldErrorAttributes(errors, "financial_account_id")}>
            ${option("", "Sem conta", fieldValue("financial_account_id"))}
            ${accounts.map((account) => option(account.id, account.name, fieldValue("financial_account_id"))).join("")}
          </select>
          ${fieldError(errors, "financial_account_id")}
        </label>
        <label>${fieldLabel("Favorecido/Pagador")}
          <input name="party_name" value="${escapeHtml(fieldValue("party_name"))}"${fieldErrorAttributes(errors, "party_name")}>
          ${fieldError(errors, "party_name")}
        </label>
        <label class="field-span-2">${fieldLabel("Observações")}
          <textarea name="notes"${fieldErrorAttributes(errors, "notes")}>${escapeHtml(fieldValue("notes"))}</textarea>
          ${fieldError(errors, "notes")}
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
