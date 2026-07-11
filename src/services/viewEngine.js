const fs = require("node:fs");
const path = require("node:path");
const { addMonths, currentCompetence, monthLabel } = require("./dateService");
const { formatMoney } = require("./moneyService");
const { statusLabel } = require("./statusService");

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

function layout({ title, user, active, body }) {
  const nav = [
    ["/dashboard", "Dashboard"],
    ["/entries", "Lançamentos"],
    ["/entries/new", "Novo lançamento"],
    ["/accounts", "Contas"],
    ["/categories", "Categorias"],
  ];

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · EmDia</title>
  <link rel="stylesheet" href="/public/css/styles.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/dashboard">
      <span class="brand-mark">E</span>
      <span>
        <strong>EmDia</strong>
        <small>Finanças do mês</small>
      </span>
    </a>
    <nav class="main-nav">
      ${nav.map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`).join("")}
    </nav>
    <div class="user-chip">${escapeHtml(user.name)}</div>
  </header>
  <main class="page">${body}</main>
</body>
</html>`;
}

function monthSwitcher(pathname, competence, current = currentCompetence()) {
  return `<section class="monthbar">
    <div>
      <span class="eyebrow">Competência selecionada</span>
      <h1>${escapeHtml(monthLabel(competence))}</h1>
    </div>
    <div class="month-actions">
      <a class="icon-button" title="Mês anterior" href="${pathname}?competence=${addMonths(competence, -1)}">‹</a>
      <form action="${pathname}" method="get" class="month-form">
        <input type="month" name="competence" value="${escapeHtml(competence)}" aria-label="Competência">
        <button type="submit">Aplicar</button>
      </form>
      <a class="icon-button" title="Próximo mês" href="${pathname}?competence=${addMonths(competence, 1)}">›</a>
      <a class="ghost-button" href="${pathname}?competence=${current}">Mês atual</a>
    </div>
  </section>`;
}

function card(label, value, tone = "") {
  return `<article class="metric ${tone}">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </article>`;
}

function entriesTable(entries, { compact = false } = {}) {
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
                    <form method="post" action="/entries/${entry.id}/duplicate"><button type="submit">Duplicar</button></form>
                    <form method="post" action="/entries/${entry.id}/cancel"><button type="submit">Cancelar</button></form>
                  </td>`
              }
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>`;
}

function dashboardView({ user, competence, dashboard }) {
  const current = currentCompetence(user.timezone);
  const categoryRows = Object.entries(dashboard.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, cents]) => `<li><span>${escapeHtml(name)}</span><strong>${formatMoney(cents)}</strong></li>`)
    .join("");

  return layout({
    title: "Dashboard",
    user,
    active: "/dashboard",
    body: `
      ${monthSwitcher("/dashboard", competence, current)}
      <section class="metrics-grid">
        ${card("Saldo previsto", formatMoney(dashboard.cards.expectedBalance), dashboard.cards.expectedBalance >= 0 ? "good" : "bad")}
        ${card("Receitas previstas", formatMoney(dashboard.cards.incomeExpected), "good")}
        ${card("Receitas recebidas", formatMoney(dashboard.cards.incomeReceived), "good")}
        ${card("Despesas previstas", formatMoney(dashboard.cards.expenseExpected), "bad")}
        ${card("Despesas pagas", formatMoney(dashboard.cards.expensePaid))}
        ${card("Despesas vencidas", formatMoney(dashboard.cards.expenseOverdue), "bad")}
        ${card("Despesas pendentes", formatMoney(dashboard.cards.expensePending))}
        ${card("Vencem hoje", String(dashboard.cards.dueToday))}
      </section>
      <section class="split">
        <article class="panel">
          <div class="section-title">
            <h2>Próximos lançamentos</h2>
            <a href="/entries?competence=${competence}">Ver todos</a>
          </div>
          ${entriesTable(dashboard.upcoming, { compact: true })}
        </article>
        <article class="panel">
          <div class="section-title">
            <h2>Despesas por categoria</h2>
          </div>
          <ul class="category-list">${categoryRows || "<li><span>Nenhuma despesa</span><strong>R$ 0,00</strong></li>"}</ul>
        </article>
      </section>
    `,
  });
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
            ${option("EXPENSE", "Despesas", filters.entry_type)}
            ${option("INCOME", "Receitas", filters.entry_type)}
          </select>
          <select name="status">
            ${option("", "Todos os status", filters.status)}
            ${["PENDING", "OVERDUE", "PARTIALLY_PAID", "PAID", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]
              .map((status) => option(status, statusLabel(status), filters.status))
              .join("")}
          </select>
          <select name="category_id">
            ${option("", "Todas as categorias", filters.category_id)}
            ${categories.map((category) => option(category.id, `${category.name} (${category.entry_type})`, filters.category_id)).join("")}
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
      ${entriesTable(entries)}
    `,
  });
}

function entryFormView({ user, entry, competence, categories, accounts, action }) {
  const isEdit = Boolean(entry);
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
      <form method="post" action="${action}" class="form-grid panel">
        <label>Tipo
          <select name="entry_type">
            ${option("EXPENSE", "Despesa", type)}
            ${option("INCOME", "Receita", type)}
          </select>
        </label>
        <label>Competência
          <input type="month" name="competence_month" value="${escapeHtml(selectedCompetence)}" required>
        </label>
        <label class="wide">Descrição
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
            ${categories.map((category) => option(category.id, `${category.name} (${category.entry_type})`, entry?.category_id)).join("")}
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
        <label class="wide">Observações
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

function accountsView({ user, accounts }) {
  return layout({
    title: "Contas",
    user,
    active: "/accounts",
    body: `
      <section class="page-heading"><span class="eyebrow">Cadastros</span><h1>Contas financeiras</h1></section>
      <section class="split">
        <form method="post" action="/accounts" class="panel form-stack">
          <label>Nome<input name="name" required></label>
          <label>Tipo
            <select name="type">
              ${["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET", "CREDIT_CARD", "OTHER"].map((type) => option(type, type, "")).join("")}
            </select>
          </label>
          <label>Instituição<input name="institution_name"></label>
          <label>Saldo inicial<input name="initial_balance" inputmode="decimal" value="0,00"></label>
          <button type="submit">Adicionar conta</button>
        </form>
        <article class="panel">${accountsTable(accounts)}</article>
      </section>
    `,
  });
}

function accountsTable(accounts) {
  return `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Instituição</th><th>Saldo inicial</th></tr></thead><tbody>
    ${accounts.map((account) => `<tr><td>${escapeHtml(account.name)}</td><td>${escapeHtml(account.type)}</td><td>${escapeHtml(account.institution_name || "-")}</td><td>${formatMoney(account.initial_balance_cents)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function categoriesView({ user, categories }) {
  return layout({
    title: "Categorias",
    user,
    active: "/categories",
    body: `
      <section class="page-heading"><span class="eyebrow">Cadastros</span><h1>Categorias</h1></section>
      <section class="split">
        <form method="post" action="/categories" class="panel form-stack">
          <label>Nome<input name="name" required></label>
          <label>Tipo
            <select name="entry_type">
              ${option("EXPENSE", "Despesa", "")}
              ${option("INCOME", "Receita", "")}
              ${option("BOTH", "Ambos", "")}
            </select>
          </label>
          <label>Cor<input type="color" name="color" value="#0f766e"></label>
          <button type="submit">Adicionar categoria</button>
        </form>
        <article class="panel"><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th></tr></thead><tbody>
          ${categories.map((category) => `<tr><td>${escapeHtml(category.name)}</td><td>${escapeHtml(category.entry_type)}</td></tr>`).join("")}
        </tbody></table></div></article>
      </section>
    `,
  });
}

function notFoundView(user) {
  return layout({
    title: "Não encontrado",
    user,
    active: "",
    body: `<section class="page-heading"><span class="eyebrow">404</span><h1>Página não encontrada</h1><p>O caminho solicitado não existe no MVP atual.</p></section>`,
  });
}

function staticFile(filePath) {
  return fs.readFileSync(path.join(__dirname, "..", "..", filePath));
}

module.exports = {
  accountsView,
  categoriesView,
  dashboardView,
  entriesListView,
  entryDetailView,
  entryFormView,
  escapeHtml,
  notFoundView,
  staticFile,
};
