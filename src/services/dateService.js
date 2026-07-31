function currentCompetence(timezone = "America/Bahia") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  return `${year}-${month}`;
}

function todayIso(timezone = "America/Bahia") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;
  return `${year}-${month}-${day}`;
}

function isCompetence(value) {
  return /^\d{4}-\d{2}$/.test(value || "");
}

function normalizeCompetence(value, timezone) {
  return isCompetence(value) ? value : currentCompetence(timezone);
}

function addMonths(competence, offset) {
  const [year, month] = competence.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(competence) {
  const [year, month] = competence.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function dueDateFromCompetence(competence, day = 10) {
  const [year, month] = competence.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${competence}-${String(Math.min(Number(day) || 10, lastDay)).padStart(2, "0")}`;
}

function formatCivilDate(value, fallback = "-") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return fallback;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isValid = date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);

  return isValid ? `${day}/${month}/${year}` : fallback;
}

module.exports = {
  addMonths,
  currentCompetence,
  dueDateFromCompetence,
  formatCivilDate,
  isCompetence,
  monthLabel,
  normalizeCompetence,
  todayIso,
};
