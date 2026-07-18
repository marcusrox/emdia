const { currentCompetence, todayIso } = require("../services/dateService");
const { formatMoney } = require("../services/moneyService");
const { entryTypeLabel, escapeHtml, lucideIcon } = require("../services/viewHelpers");
const { layout, monthSwitcher } = require("./layout");

const STATUS_LABELS = {
  PENDING: "Pendente", OVERDUE: "Vencido", PARTIALLY_PAID: "Pago parcialmente",
  PAID: "Pago", PARTIALLY_RECEIVED: "Recebido parcialmente", RECEIVED: "Recebido",
  CANCELLED: "Cancelado", DRAFT: "Rascunho",
};

function weekdayLabel(date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function calendarEntry(entry, competence) {
  const type = entryTypeLabel(entry.entry_type);
  const status = STATUS_LABELS[entry.status] || entry.status;
  const icon = entry.entry_type === "INCOME" ? "arrow-down-left" : "arrow-up-right";
  return `<li><a class="calendar-entry calendar-entry-${entry.entry_type.toLowerCase()}" href="/entries/${escapeHtml(entry.id)}?competence=${escapeHtml(competence)}&amp;return_to=calendar">
    <span class="calendar-entry-icon" aria-hidden="true">${lucideIcon(icon)}</span>
    <span class="calendar-entry-main"><strong>${escapeHtml(entry.description)}</strong><span>${escapeHtml(type)} · ${formatMoney(entry.expected_amount_cents)}</span></span>
    <span class="status status-${escapeHtml(entry.status.toLowerCase())}">${escapeHtml(status)}</span>
  </a></li>`;
}

function calendarDay(day, competence, today, firstDayOffset) {
  const isToday = day.date === today;
  const classes = ["calendar-day", isToday ? "calendar-day-today" : "", day.entries.length ? "" : "calendar-day-empty"].filter(Boolean).join(" ");
  const style = day.day === 1 ? ` style="--calendar-start: ${firstDayOffset + 1}"` : "";
  return `<article class="${classes}"${style}${isToday ? ' aria-current="date"' : ""}>
    <header class="calendar-day-heading"><span class="calendar-day-number">${day.day}</span><span>${escapeHtml(weekdayLabel(day.date))}${isToday ? " · Hoje" : ""}</span></header>
    ${day.entries.length ? `<ul class="calendar-entry-list">${day.entries.map((entry) => calendarEntry(entry, competence)).join("")}</ul>` : '<p class="calendar-day-no-entries">Sem movimentação</p>'}
  </article>`;
}

function calendarView({ user, competence, calendar }) {
  const today = todayIso(user.timezone);
  const firstDayOffset = new Date(`${competence}-01T12:00:00Z`).getUTCDay();
  return layout({
    title: "Agenda financeira", user, active: "/calendar",
    body: `${monthSwitcher({ pathname: "/calendar", competence, current: currentCompetence(user.timezone), title: "Agenda financeira", eyebrow: "Vencimentos", icon: "calendar-days" })}
      ${calendar.entryCount === 0 ? '<div class="empty-state calendar-month-empty" role="status"><strong>Nenhum lançamento neste mês.</strong><p>Todos os dias estão livres de movimentações previstas.</p></div>' : ""}
      <section class="financial-calendar" aria-label="Agenda cronológica do mês">
        <div class="calendar-weekdays" aria-hidden="true"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>
        <div class="calendar-days">${calendar.days.map((day) => calendarDay(day, competence, today, firstDayOffset)).join("")}</div>
      </section>
      ${calendar.undated.length ? `<section class="panel calendar-undated"><div class="section-title"><h2>Sem vencimento</h2></div><ul class="calendar-entry-list">${calendar.undated.map((entry) => calendarEntry(entry, competence)).join("")}</ul></section>` : ""}`,
  });
}

module.exports = { calendarView };
