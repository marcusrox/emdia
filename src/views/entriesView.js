const { formatMoney } = require("../services/moneyService");
const { statusLabel } = require("../services/statusService");
const {
  buttonContent,
  buttonLink,
  categoryOptionLabel,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  fieldError,
  fieldErrorAttributes,
  lucideIcon,
  moneyInput,
  option,
} = require("../services/viewHelpers");
const { currentCompetence } = require("../services/dateService");
const { auditHistoryList } = require("./auditView");
const { layout, monthSwitcher } = require("./layout");

const ACTION_ICONS = {
  edit: lucideIcon("pencil"),
  duplicate: lucideIcon("copy"),
  cancel: lucideIcon("circle-x"),
};

const TOOLBAR_ICONS = {
  filter: lucideIcon("filter"),
  clear: lucideIcon("eraser"),
  new: lucideIcon("plus"),
};

function recordActionLink({ href, icon, label, tone = "" }) {
  return `<a class="record-action-button ${tone}" href="${escapeHtml(href)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</a>`;
}

function recordActionForm({ action, icon, label, tone = "", user }) {
  return `<form class="record-action-form" method="post" action="${escapeHtml(action)}">
    ${csrfInput(user)}
    <button type="submit" class="record-action-button ${tone}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</button>
  </form>`;
}

function toolbarIconLink({ href, icon, label, tone = "" }) {
  return `<a class="toolbar-icon-button ${tone}" href="${escapeHtml(href)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${TOOLBAR_ICONS[icon]}</a>`;
}

function toolbarIconButton({ icon, label, tone = "" }) {
  return `<button type="submit" class="toolbar-icon-button ${tone}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${TOOLBAR_ICONS[icon]}</button>`;
}

function entriesTable(entries, { compact = false, user = null } = {}) {
  if (!entries.length) {
    return `<div class="empty-state">Nenhum lançamento encontrado para esta competência.</div>`;
  }

  const valueClass = (entry) =>
    [
      entry.entry_type === "INCOME" ? "positive" : "negative",
      entry.status === "CANCELLED" ? "entry-value-cancelled" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return `<div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Vencimento</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Conta</th>
          <th>Valor</th>
          <th>Status</th>
          ${compact ? "" : "<th class=\"actions-cell\">Ações</th>"}
        </tr>
      </thead>
      <tbody>
        ${entries
          .map(
            (entry) => `<tr>
              <td>${escapeHtml(entry.due_date)}</td>
              <td>
                <a class="strong-link" href="/entries/${entry.id}">${escapeHtml(entry.description)}</a>
                <small>${entry.entry_type === "INCOME" ? "Receita" : "Despesa"}${entry.recurrence_rule_id ? " · Recorrente" : ""}${entry.party_name ? ` · ${escapeHtml(entry.party_name)}` : ""}</small>
              </td>
              <td>${escapeHtml(entry.category_name || "Sem categoria")}</td>
              <td>${escapeHtml(entry.actual_account_name || entry.expected_account_name || "-")}</td>
              <td class="${valueClass(entry)}">${formatMoney(entry.expected_amount_cents)}</td>
              <td><span class="status status-${entry.status.toLowerCase()}">${escapeHtml(statusLabel(entry.status))}</span></td>
              ${
                compact
                  ? ""
                  : `<td class="record-actions-cell">
                    <div class="record-actions">
                      ${recordActionLink({
                        href: `/entries/${entry.id}/edit`,
                        icon: "edit",
                        label: "Editar lançamento",
                      })}
                      ${recordActionForm({
                        action: `/entries/${entry.id}/duplicate`,
                        icon: "duplicate",
                        label: "Duplicar lançamento",
                        user,
                      })}
                      ${recordActionForm({
                        action: `/entries/${entry.id}/cancel`,
                        icon: "cancel",
                        label: "Cancelar lançamento",
                        tone: "danger",
                        user,
                      })}
                    </div>
                  </td>`
              }
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>`;
}

function entriesListView({ user, competence, entries, filters, categories, accounts }) {
  const current = currentCompetence(user.timezone);

  return layout({
    title: "Lançamentos",
    user,
    active: "/entries",
    body: `
      ${monthSwitcher("/entries", competence, current)}
      <section class="toolbar">
        <form method="get" action="/entries" class="filters">
          <input type="hidden" name="competence" value="${escapeHtml(competence)}">
          <input name="q" value="${escapeHtml(filters.q || "")}" placeholder="Buscar descrição ou favorecido">
          <select name="entry_type">
            ${option("", "Todos os tipos", filters.entry_type)}
            ${option("EXPENSE", entryTypeLabel("EXPENSE"), filters.entry_type)}
            ${option("INCOME", entryTypeLabel("INCOME"), filters.entry_type)}
          </select>
          <select name="status">
            ${option("", "Todos os status", filters.status)}
            ${["PENDING", "OVERDUE", "PARTIALLY_PAID", "PAID", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]
              .map((status) => option(status, statusLabel(status), filters.status))
              .join("")}
          </select>
          <select name="category_id">
            ${option("", "Todas as categorias", filters.category_id)}
            ${categories.map((category) => option(category.id, categoryOptionLabel(category), filters.category_id)).join("")}
          </select>
          <select name="account_id">
            ${option("", "Todas as contas", filters.account_id)}
            ${accounts.map((account) => option(account.id, account.name, filters.account_id)).join("")}
          </select>
          <div class="toolbar-actions">
            ${toolbarIconButton({
              icon: "filter",
              label: "Filtrar lançamentos",
              tone: "primary",
            })}
            ${toolbarIconLink({
              href: `/entries?competence=${competence}`,
              icon: "clear",
              label: "Limpar filtros",
            })}
          </div>
        </form>
        ${toolbarIconLink({
          href: `/entries/new?competence=${competence}`,
          icon: "new",
          label: "Novo lançamento",
          tone: "primary",
        })}
      </section>
      ${entriesTable(entries, { user })}
    `,
  });
}

function entryFormView({ user, entry, competence, categories, accounts, action, errors = {} }) {
  const isEdit = Boolean(entry?.id);
  const fieldValue = (field, fallback = "") => entry?.[field] ?? fallback;
  const selectedCompetence = fieldValue("competence_month", competence);
  const type = fieldValue("entry_type", "EXPENSE");
  const expectedAmount = entry?.expected_amount ?? moneyInput(entry?.expected_amount_cents);
  const realizedAmount = entry?.realized_amount ?? moneyInput(entry?.realized_amount_cents);

  return layout({
    title: isEdit ? "Editar lançamento" : "Novo lançamento",
    user,
    active: "/entries/new",
    body: `
      <section class="page-heading">
        <span class="eyebrow">${isEdit ? "Editar" : "Novo"}</span>
        <h1>${isEdit ? escapeHtml(entry.description) : "Lançamento financeiro"}</h1>
      </section>
      <form method="post" action="${action}" class="form-grid form-compact panel" data-validate-form>
        ${csrfInput(user)}
        <label class="field-span-2">Descrição
          <input name="description" value="${escapeHtml(fieldValue("description"))}" required${fieldErrorAttributes(errors, "description")}>
          ${fieldError(errors, "description")}
        </label>
        <label>Tipo
          <select name="entry_type"${fieldErrorAttributes(errors, "entry_type")}>
            ${option("EXPENSE", entryTypeLabel("EXPENSE"), type)}
            ${option("INCOME", entryTypeLabel("INCOME"), type)}
          </select>
          ${fieldError(errors, "entry_type")}
        </label>
        <label>Competência
          <input type="month" name="competence_month" value="${escapeHtml(selectedCompetence)}" required${fieldErrorAttributes(errors, "competence_month")}>
          ${fieldError(errors, "competence_month")}
        </label>

        <label>Valor previsto
          <input name="expected_amount" inputmode="decimal" value="${escapeHtml(expectedAmount)}" required data-validate-money data-error-message="Informe um valor válido, como 100,00."${fieldErrorAttributes(errors, "expected_amount")}>
          ${fieldError(errors, "expected_amount")}
        </label>
        <label>Valor realizado
          <input name="realized_amount" inputmode="decimal" value="${escapeHtml(realizedAmount)}" data-validate-money data-error-message="Informe um valor válido, como 100,00."${fieldErrorAttributes(errors, "realized_amount")}>
          ${fieldError(errors, "realized_amount")}
        </label>
        <label>Vencimento
          <input type="date" name="due_date" value="${escapeHtml(fieldValue("due_date"))}" required${fieldErrorAttributes(errors, "due_date")}>
          ${fieldError(errors, "due_date")}
        </label>
        <label>Emissão
          <input type="date" name="issue_date" value="${escapeHtml(fieldValue("issue_date"))}"${fieldErrorAttributes(errors, "issue_date")}>
          ${fieldError(errors, "issue_date")}
        </label>
        <label>Categoria
          <select name="category_id"${fieldErrorAttributes(errors, "category_id")}>
            ${option("", "Sem categoria", fieldValue("category_id"))}
            ${categories.map((category) => option(category.id, categoryOptionLabel(category), fieldValue("category_id"))).join("")}
          </select>
          ${fieldError(errors, "category_id")}
        </label>
        <label>Conta prevista
          <select name="expected_account_id"${fieldErrorAttributes(errors, "expected_account_id")}>
            ${option("", "Sem conta", fieldValue("expected_account_id"))}
            ${accounts.map((account) => option(account.id, account.name, fieldValue("expected_account_id"))).join("")}
          </select>
          ${fieldError(errors, "expected_account_id")}
        </label>
        <label>Conta efetiva
          <select name="actual_account_id"${fieldErrorAttributes(errors, "actual_account_id")}>
            ${option("", "Usar na baixa", fieldValue("actual_account_id"))}
            ${accounts.map((account) => option(account.id, account.name, fieldValue("actual_account_id"))).join("")}
          </select>
          ${fieldError(errors, "actual_account_id")}
        </label>
        <label>Favorecido/Pagador
          <input name="party_name" value="${escapeHtml(fieldValue("party_name"))}"${fieldErrorAttributes(errors, "party_name")}>
          ${fieldError(errors, "party_name")}
        </label>
        <label class="field-span-2">Observações
          <textarea name="notes"${fieldErrorAttributes(errors, "notes")}>${escapeHtml(fieldValue("notes"))}</textarea>
          ${fieldError(errors, "notes")}
        </label>
        <div class="form-actions wide">
          ${buttonLink({ href: `/entries?competence=${selectedCompetence}`, label: "Voltar", icon: "arrow-left" })}
          <button type="submit">${buttonContent("Salvar", "save")}</button>
        </div>
      </form>
    `,
  });
}

function entryDetailView({ user, entry, settlements, accounts, auditEvents = [], settlementErrors = {}, settlementValues = null }) {
  const settlementValue = (field, fallback = "") => settlementValues?.[field] ?? fallback;
  const principalValue = settlementValue("principal", moneyInput(entry.expected_amount_cents - entry.realized_amount_cents));
  const settledAtValue = settlementValue("settled_at", new Date().toISOString().slice(0, 10));

  return layout({
    title: entry.description,
    user,
    active: "/entries",
    body: `
      <section class="page-heading">
        <span class="eyebrow">${entry.entry_type === "INCOME" ? "Receita" : "Despesa"} · ${escapeHtml(entry.competence_month)}</span>
        <h1>${escapeHtml(entry.description)}</h1>
      </section>
      <section class="split">
        <article class="panel detail-list">
          <p><span>Status</span><strong>${escapeHtml(statusLabel(entry.status))}</strong></p>
          <p><span>Valor previsto</span><strong>${formatMoney(entry.expected_amount_cents)}</strong></p>
          <p><span>Valor realizado</span><strong>${formatMoney(entry.realized_amount_cents)}</strong></p>
          <p><span>Vencimento</span><strong>${escapeHtml(entry.due_date)}</strong></p>
          <p><span>Categoria</span><strong>${escapeHtml(entry.category_name || "-")}</strong></p>
          ${
            entry.recurrence_rule_id
              ? `<p><span>Origem</span><strong><a class="strong-link" href="/recurrences/${entry.recurrence_rule_id}/edit">Recorrência: ${escapeHtml(entry.recurrence_description || entry.description)}</a></strong></p>`
              : ""
          }
          <p><span>Conta</span><strong>${escapeHtml(entry.actual_account_name || entry.expected_account_name || "-")}</strong></p>
          <p><span>Favorecido/Pagador</span><strong>${escapeHtml(entry.party_name || "-")}</strong></p>
          <div class="form-actions">
            ${buttonLink({ href: `/entries?competence=${entry.competence_month}`, label: "Voltar", icon: "arrow-left" })}
            ${buttonLink({ href: `/entries/${entry.id}/edit`, label: "Editar", icon: "pencil", tone: "primary" })}
          </div>
        </article>
        <article class="panel">
          <div class="section-title"><h2>Registrar baixa</h2></div>
          <form method="post" action="/entries/${entry.id}/settlements" class="settlement-form" data-validate-form>
            ${csrfInput(user)}
            <label>Conta
              <select name="financial_account_id" required${fieldErrorAttributes(settlementErrors, "financial_account_id")}>
                ${accounts.map((account) => option(account.id, account.name, settlementValue("financial_account_id", entry.actual_account_id || entry.expected_account_id))).join("")}
              </select>
              ${fieldError(settlementErrors, "financial_account_id")}
            </label>
            <label>Valor principal
              <input name="principal" inputmode="decimal" value="${escapeHtml(principalValue)}" required data-validate-money data-error-message="Informe um valor válido, como 100,00."${fieldErrorAttributes(settlementErrors, "principal")}>
              ${fieldError(settlementErrors, "principal")}
            </label>
            <label>Data
              <input type="date" name="settled_at" value="${escapeHtml(settledAtValue)}" required${fieldErrorAttributes(settlementErrors, "settled_at")}>
              ${fieldError(settlementErrors, "settled_at")}
            </label>
            <label>Juros
              <input name="interest" inputmode="decimal" value="${escapeHtml(settlementValue("interest", "0,00"))}" data-validate-money data-error-message="Informe um valor válido, como 100,00."${fieldErrorAttributes(settlementErrors, "interest")}>
              ${fieldError(settlementErrors, "interest")}
            </label>
            <label>Multa
              <input name="penalty" inputmode="decimal" value="${escapeHtml(settlementValue("penalty", "0,00"))}" data-validate-money data-error-message="Informe um valor válido, como 100,00."${fieldErrorAttributes(settlementErrors, "penalty")}>
              ${fieldError(settlementErrors, "penalty")}
            </label>
            <label>Desconto
              <input name="discount" inputmode="decimal" value="${escapeHtml(settlementValue("discount", "0,00"))}" data-validate-money data-error-message="Informe um valor válido, como 100,00."${fieldErrorAttributes(settlementErrors, "discount")}>
              ${fieldError(settlementErrors, "discount")}
            </label>
            <button type="submit">${buttonContent("Baixar", "check-circle")}</button>
          </form>
          <div class="section-title compact"><h2>Baixas</h2></div>
          <ul class="settlement-list">
            ${
              settlements.length
                ? settlements.map((item) => `<li><span>${escapeHtml(item.settled_at)} · ${escapeHtml(item.account_name)}</span><strong>${formatMoney(item.total_cents)}</strong></li>`).join("")
                : "<li><span>Nenhuma baixa registrada</span><strong>-</strong></li>"
            }
          </ul>
          <div class="section-title compact"><h2>Histórico</h2></div>
          ${auditHistoryList(auditEvents)}
        </article>
      </section>
    `,
  });
}

module.exports = {
  entriesListView,
  entriesTable,
  entryDetailView,
  entryFormView,
};
