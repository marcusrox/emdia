const { accountsView } = require("../views/accountsView");
const { categoriesView } = require("../views/categoriesView");
const { dashboardView } = require("../views/dashboardView");
const { entriesListView, entryDetailView, entryFormView } = require("../views/entriesView");
const { loginView } = require("../views/authView");
const { notFoundView } = require("../views/errorsView");
const { settingsView } = require("../views/settingsView");
const { escapeHtml } = require("./viewHelpers");

module.exports = {
  accountsView,
  categoriesView,
  dashboardView,
  entriesListView,
  entryDetailView,
  entryFormView,
  escapeHtml,
  loginView,
  notFoundView,
  settingsView,
};
