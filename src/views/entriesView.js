const { formatMoney } = require("../services/moneyService");
const { statusLabel } = require("../services/statusService");
const {
  categoryOptionLabel,
  csrfInput,
  entryTypeLabel,
  escapeHtml,
  moneyInput,
  option,
} = require("../services/viewHelpers");
const { currentCompetence } = require("../services/dateService");
const { layout, monthSwitcher } = require("./layout");

function entriesTable(entries, { compact = false, user = null } = {}) {
  if (!entries.length) {
    return `<div class="empty-state">Nenhum lançamento encontrado para esta competência.</div>`;
  }

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
          ${compact ? "" : "<th>Ações</th>"}
        </tr>
      </thead>
      <tbody>
        ${entries
          .map(
            (entry) => `<tr>
              <td>${escapeHtml(entry.due_date)}</td>
              <td>
                <a class="strong-link" href="/entries/${entry.id}">${escapeHtml(entry.description)}</a>
                <small>${entry.entry_type === "INCOME" ? "Receita" : "Despesa"}${entry.party_name ? ` · ${escapeHtml(entry.party_name)}` : ""}</small>
              </td>
              <td>${escapeHtml(entry.category_name || "Sem categoria")}</td>
              <td>${escapeHtml(entry.actual_account_name || entry.expected_account_name || "-")}</td>
              <td class="${entry.entry_type === "INCOME" ? "positive" : "negative"}">${formatMoney(entry.expected_amount_cents)}</td>
              <td><span class="status status-${entry.status.toLowerCase()}">${escapeHtml(statusLabel(entry.status))}</span></td>
              ${
                compact
                  ? ""
                  : `<td class="actions">
                    <a href="/entries/${entry.id}/edit">Editar</a>
                    <form method="post" action="/entries/${entry.id}/duplicate">${csrfInput(user)}<button type="submit">Duplicar</button></form>
                    <form method="post" action="/entries/${entry.id}/cancel">${csrfInput(user)}<button type="submit">Cancelar</button></form>
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
          <button type="submit">Filtrar</button>
          <a class="ghost-button" href="/entries?competence=${competence}">Limpar</a>
        </form>
        <a class="primary-button" href="/entries/new?competence=${competence}">Novo lançamento</a>
      </section>
      ${entriesTable(entries, { user })}
    `,
  });
}

function entryFormView({ user, entry, competence, categories, accounts, action }) {
  const isEdit = Boolean(entry?.id);
  const selectedCompetence = entry ? entry.competence_month : competence;
  const type = entry ? entry.entry_type : "EXPENSE";

  return layout({
    title: isEdit ? "Editar lançamento" : "Novo lançamento",
    user,
    active: "/entries/new",
    body: `
      <section class="page-heading">
        <span class="eyebrow">${isEdit ? "Editar" : "Novo"}</span>
        <h1>${isEdit ? escapeHtml(entry.description) : "Lançamento financeiro"}</h1>
      </section>
      <form method="post" action="${action}" class="form-grid form-compact panel">
        ${csrfInput(user)}
        <label>Tipo
          <select name="entry_type">
            ${option("EXPENSE", entryTypeLabel("EXPENSE"), type)}
            ${option("INCOME", entryTypeLabel("INCOME"), type)}
          </select>
        </label>
        <label>Competência
          <input type="month" name="competence_month" value="${escapeHtml(selectedCompetence)}" required>
        </label>
        <label class="field-span-2">Descrição
          <input name="description" value="${escapeHtml(entry?.description || "")}" required>
        </label>
        <label>Valor previsto
          <input name="expected_amount" inputmode="decimal" value="${escapeHtml(moneyInput(entry?.expected_amount_cents))}" required>
        </label>
        <label>Valor realizado
          <input name="realized_amount" inputmode="decimal" value="${escapeHtml(moneyInput(entry?.realized_amount_cents))}">
        </label>
        <label>Vencimento
          <input type="date" name="due_date" value="${escapeHtml(entry?.due_date || "")}" required>
        </label>
        <label>Emissão
          <input type="date" name="issue_date" value="${escapeHtml(entry?.issue_date || "")}">
        </label>
        <label>Categoria
          <select name="category_id">
            ${option("", "Sem categoria", entry?.category_id)}
            ${categories.map((category) => option(category.id, categoryOptionLabel(category), entry?.category_id)).join("")}
          </select>
        </label>
        <label>Conta prevista
          <select name="expected_account_id">
            ${option("", "Sem conta", entry?.expected_account_id)}
            ${accounts.map((account) => option(account.id, account.name, entry?.expected_account_id)).join("")}
          </select>
        </label>
        <label>Conta efetiva
          <select name="actual_account_id">
            ${option("", "Usar na baixa", entry?.actual_account_id)}
            ${accounts.map((account) => option(account.id, account.name, entry?.actual_account_id)).join("")}
          </select>
        </label>
        <label>Favorecido/Pagador
          <input name="party_name" value="${escapeHtml(entry?.party_name || "")}">
        </label>
        <label class="field-span-2">Observações
          <textarea name="notes">${escapeHtml(entry?.notes || "")}</textarea>
        </label>
        <div class="form-actions wide">
          <a class="ghost-button" href="/entries?competence=${selectedCompetence}">Voltar</a>
          <button type="submit">Salvar</button>
        </div>
      </form>
    `,
  });
}

function entryDetailView({ user, entry, settlements, accounts }) {
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
          <p><span>Conta</span><strong>${escapeHtml(entry.actual_account_name || entry.expected_account_name || "-")}</strong></p>
          <p><span>Favorecido/Pagador</span><strong>${escapeHtml(entry.party_name || "-")}</strong></p>
          <div class="form-actions">
            <a class="ghost-button" href="/entries?competence=${entry.competence_month}">Voltar</a>
            <a class="primary-button" href="/entries/${entry.id}/edit">Editar</a>
          </div>
        </article>
        <article class="panel">
          <div class="section-title"><h2>Registrar baixa</h2></div>
          <form method="post" action="/entries/${entry.id}/settlements" class="settlement-form">
            ${csrfInput(user)}
            <label>Conta
              <select name="financial_account_id" required>
                ${accounts.map((account) => option(account.id, account.name, entry.actual_account_id || entry.expected_account_id)).join("")}
              </select>
            </label>
            <label>Valor principal
              <input name="principal" inputmode="decimal" value="${escapeHtml(moneyInput(entry.expected_amount_cents - entry.realized_amount_cents))}" required>
            </label>
            <label>Data
              <input type="date" name="settled_at" value="${new Date().toISOString().slice(0, 10)}" required>
            </label>
            <label>Juros
              <input name="interest" inputmode="decimal" value="0,00">
            </label>
            <label>Multa
              <input name="penalty" inputmode="decimal" value="0,00">
            </label>
            <label>Desconto
              <input name="discount" inputmode="decimal" value="0,00">
            </label>
            <button type="submit">Baixar</button>
          </form>
          <div class="section-title compact"><h2>Baixas</h2></div>
          <ul class="settlement-list">
            ${
              settlements.length
                ? settlements.map((item) => `<li><span>${escapeHtml(item.settled_at)} · ${escapeHtml(item.account_name)}</span><strong>${formatMoney(item.total_cents)}</strong></li>`).join("")
                : "<li><span>Nenhuma baixa registrada</span><strong>-</strong></li>"
            }
          </ul>
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
