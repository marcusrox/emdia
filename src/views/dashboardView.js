const { currentCompetence } = require("../services/dateService");
const { formatMoney } = require("../services/moneyService");
const { escapeHtml } = require("../services/viewHelpers");
const { card, layout, monthSwitcher } = require("./layout");
const { entriesTable } = require("./entriesView");

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
      ${monthSwitcher({ pathname: "/dashboard", competence, current, title: "Dashboard", eyebrow: "Visão geral" })}
      <section class="metrics-grid">
        ${card("Saldo previsto", formatMoney(dashboard.cards.expectedBalance), dashboard.cards.expectedBalance >= 0 ? "balance good" : "balance bad", "wallet-cards")}
        ${card("Receitas previstas", formatMoney(dashboard.cards.incomeExpected), "income good", "trending-up")}
        ${card("Receitas recebidas", formatMoney(dashboard.cards.incomeReceived), "received good", "badge-check")}
        ${card("Despesas previstas", formatMoney(dashboard.cards.expenseExpected), "expense bad", "receipt-text")}
        ${card("Despesas pagas", formatMoney(dashboard.cards.expensePaid), "paid", "circle-check-big")}
        ${card("Despesas vencidas", formatMoney(dashboard.cards.expenseOverdue), "overdue bad", "triangle-alert")}
        ${card("Despesas pendentes", formatMoney(dashboard.cards.expensePending), "pending", "clock-3")}
        ${card("Vencem hoje", String(dashboard.cards.dueToday), "today", "calendar-clock")}
      </section>
      <section class="split">
        <article class="panel">
          <div class="section-title">
            <h2>Próximos lançamentos</h2>
            <a href="/entries?competence=${competence}">Ver todos</a>
          </div>
          ${entriesTable(dashboard.upcoming, { compact: true, user })}
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

module.exports = {
  dashboardView,
};
