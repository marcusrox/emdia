const Account = require("../models/FinancialAccount");
const AuditLog = require("../models/AuditLog");
const Category = require("../models/Category");
const Settlement = require("../models/Settlement");
const { resolveMonthlyCompetence } = require("./monthlyCompetenceService");
const {
  entryDetailView,
  entryFormView,
} = require("./viewEngine");

function entryForm(user, { entry = null, competence, action, errors = {} }) {
  return entryFormView({
    user,
    entry,
    competence,
    categories: Category.list(user.id),
    accounts: Account.active(user.id),
    action,
    errors,
  });
}

function entryDetail(user, entry, {
  competence = "",
  returnTo = "",
  settlementErrors = {},
  settlementValues = null,
  reversalErrors = {},
  reversalValues = {},
} = {}) {
  return entryDetailView({
    user,
    entry,
    competence: resolveMonthlyCompetence(user, competence),
    returnTo,
    settlements: Settlement.listByEntry(user.id, entry.id),
    accounts: Account.active(user.id),
    auditEvents: AuditLog.listEntityHistory(user.id, "financial_entry", entry.id),
    settlementErrors,
    settlementValues,
    reversalErrors,
    reversalValues,
  });
}

module.exports = {
  entryDetail,
  entryForm,
};
