const { formatMoney } = require("../services/moneyService");
const {
  ACCOUNT_TYPE_OPTIONS,
  accountTypeLabel,
  buttonContent,
  buttonLink,
  csrfInput,
  escapeHtml,
  lucideIcon,
  moneyInput,
  option,
  pageHeading,
} = require("../services/viewHelpers");
const { layout } = require("./layout");

const ACTION_ICONS = {
  archive: lucideIcon("archive"),
  edit: lucideIcon("pencil"),
  delete: lucideIcon("trash-2"),
  restore: lucideIcon("rotate-ccw"),
};

const DELETE_ACCOUNT_CONFIRM_MESSAGE =
  "Excluir esta conta? Esta é uma exclusão lógica: a conta sairá da lista principal, mas continuará existindo no sistema. Voce poderá reverter depois em Contas arquivadas, usando a ação de restaurar.";

function recordActionLink({ href, icon, label, tone = "" }) {
  return `<a class="record-action-button ${tone}" href="${escapeHtml(href)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</a>`;
}

function recordActionForm({ action, icon, label, tone = "", user, confirmMessage = "" }) {
  const confirmAttribute = confirmMessage ? ` onsubmit="return confirm('${escapeHtml(confirmMessage)}')"` : "";

  return `<form class="record-action-form" method="post" action="${escapeHtml(action)}"${confirmAttribute}>
    ${csrfInput(user)}
    <button type="submit" class="record-action-button ${tone}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${ACTION_ICONS[icon]}</button>
  </form>`;
}

function accountsView({ user, accounts, account = null, action = "/accounts" }) {
  const isEdit = Boolean(account?.id);

  return layout({
    title: isEdit ? "Editar conta" : "Contas",
    user,
    active: "/accounts",
    body: `
      ${pageHeading({ eyebrow: "Cadastros", title: isEdit ? "Editar conta" : "Contas", icon: "wallet-cards" })}
      <section class="split compact-crud">
        <form method="post" action="${escapeHtml(action)}" class="panel form-grid form-compact form-short">
          ${csrfInput(user)}
          <label>Nome<input name="name" value="${escapeHtml(account?.name || "")}" required></label>
          <label>Tipo
            <select name="type">
              ${ACCOUNT_TYPE_OPTIONS.map(([value, label]) => option(value, label, account?.type || "")).join("")}
            </select>
          </label>
          <label>Instituição<input name="institution_name" value="${escapeHtml(account?.institution_name || "")}"></label>
          <label>Saldo inicial<input name="initial_balance" inputmode="decimal" value="${escapeHtml(moneyInput(account?.initial_balance_cents))}"></label>
          <div class="form-actions wide">
            ${buttonLink({ href: isEdit ? "/accounts" : "/dashboard", label: "Voltar", icon: "arrow-left" })}
            <button type="submit">${buttonContent(isEdit ? "Atualizar" : "Salvar", isEdit ? "check" : "save")}</button>
          </div>
        </form>
        <article class="panel list-panel">
          <div class="panel-heading">
            <h2>Contas cadastradas</h2>
            <a class="record-action-button" href="/accounts/deleted" title="Ver contas arquivadas" aria-label="Ver contas arquivadas">${ACTION_ICONS.archive}</a>
          </div>
          ${accountsTable(accounts, user)}
        </article>
      </section>
    `,
  });
}

function deletedAccountsView({ user, accounts }) {
  return layout({
    title: "Contas arquivadas",
    user,
    active: "/accounts",
    body: `
      ${pageHeading({
        eyebrow: "Cadastros",
        title: "Contas arquivadas",
        icon: "wallet-cards",
        actions: buttonLink({ href: "/accounts", label: "Voltar para contas ativas", icon: "arrow-left" }),
      })}
      <article class="panel">${deletedAccountsTable(accounts, user)}</article>
    `,
  });
}

function accountsTable(accounts, user) {
  return `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Instituição</th><th class="money-cell">Saldo inicial</th><th class="actions-cell">Ações</th></tr></thead><tbody>
    ${accounts.map((account) => `<tr>
      <td>${escapeHtml(account.name)}</td>
      <td>${escapeHtml(accountTypeLabel(account.type))}</td>
      <td>${escapeHtml(account.institution_name || "-")}</td>
      <td class="money-cell">${formatMoney(account.initial_balance_cents)}</td>
      <td class="record-actions-cell">
        <div class="record-actions">
          ${recordActionLink({
            href: `/accounts/${account.id}/edit`,
            icon: "edit",
            label: "Editar conta",
          })}
          ${recordActionForm({
            action: `/accounts/${account.id}/delete`,
            icon: "delete",
            label: "Excluir conta",
            tone: "danger",
            user,
            confirmMessage: DELETE_ACCOUNT_CONFIRM_MESSAGE,
          })}
        </div>
      </td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

function deletedAccountsTable(accounts, user) {
  if (!accounts.length) {
    return `<div class="empty-state">Nenhum item arquivado.</div>`;
  }

  return `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Instituição</th><th class="money-cell">Saldo inicial</th><th>Arquivado em</th><th class="actions-cell">Ações</th></tr></thead><tbody>
    ${accounts.map((account) => `<tr>
      <td>${escapeHtml(account.name)}</td>
      <td>${escapeHtml(accountTypeLabel(account.type))}</td>
      <td>${escapeHtml(account.institution_name || "-")}</td>
      <td class="money-cell">${formatMoney(account.initial_balance_cents)}</td>
      <td>${escapeHtml(formatArchivedAt(account.deleted_at, user.timezone))}</td>
      <td class="record-actions-cell">
        <div class="record-actions">
          ${recordActionForm({
            action: `/accounts/${account.id}/restore`,
            icon: "restore",
            label: "Restaurar conta",
            user,
          })}
        </div>
      </td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

function formatArchivedAt(value, timezone = "America/Bahia") {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

module.exports = {
  accountsView,
  deletedAccountsView,
};
