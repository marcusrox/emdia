const Entry = require("../models/FinancialEntry");
const Recurrence = require("../models/Recurrence");
const { queryValue, redirect, sendHtml } = require("../services/http");
const { resolveMonthlyCompetence } = require("../services/monthlyCompetenceService");
const {
  calendarView,
  dashboardView,
} = require("../services/viewEngine");

function registerDashboardRoutes(app) {
  app.get("/", (req, res) => {
    return redirect(res, "/dashboard");
  });

  app.get("/dashboard", (req, res) => {
    const user = req.user;
    const competence = resolveMonthlyCompetence(user, queryValue(req, "competence"));
    Recurrence.generateForCompetence(user, competence);
    return sendHtml(res, dashboardView({ user, competence, dashboard: Entry.dashboard(user, competence) }));
  });

  app.get("/calendar", (req, res) => {
    const user = req.user;
    const competence = resolveMonthlyCompetence(user, queryValue(req, "competence"));
    Recurrence.generateForCompetence(user, competence);
    return sendHtml(res, calendarView({ user, competence, calendar: Entry.calendar(user, competence) }));
  });
}

module.exports = {
  registerDashboardRoutes,
};
