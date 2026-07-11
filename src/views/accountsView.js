const { formatMoney } = require("../services/moneyService");
const {
  ACCOUNT_TYPE_OPTIONS,
  accountTypeLabel,
  csrfInput,
  escapeHtml,
  option,
} = require("../services/viewHelpers");
const { layout } = require("./layout");

function accountsView({ user, accounts }) {
  return layout({
    title: "Contas",
    user,
    active: "/accounts",
    body: `
      <section class="page-heading"><span class="eyebrow">Cadastros</span><h1>Contas</h1></section>
      <section class="split compact-crud">
        <form method="post" action="/accounts" class="panel form-grid form-compact form-short">
          ${csrfInput(user)}
          <label>Nome<input name="name" required></label>
          <label>Tipo
            <select name="type">
              ${ACCOUNT_TYPE_OPTIONS.map(([value, label]) => option(value, label, "")).join("")}
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
    ${accounts.map((account) => `<tr><td>${escapeHtml(account.name)}</td><td>${escapeHtml(accountTypeLabel(account.type))}</td><td>${escapeHtml(account.institution_name || "-")}</td><td>${formatMoney(account.initial_balance_cents)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

module.exports = {
  accountsView,
};
