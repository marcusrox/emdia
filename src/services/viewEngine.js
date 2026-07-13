const { accountsView, deletedAccountsView } = require("../views/accountsView");
const { categoriesView, deletedCategoriesView } = require("../views/categoriesView");
const { dashboardView } = require("../views/dashboardView");
const { entriesListView, entryDetailView, entryFormView } = require("../views/entriesView");
const { loginView } = require("../views/authView");
const { notFoundView } = require("../views/errorsView");
const { profileView } = require("../views/profileView");
const { recurrenceFormView, recurrencesListView } = require("../views/recurrencesView");
const { settingsView } = require("../views/settingsView");
const { escapeHtml } = require("./viewHelpers");

module.exports = {
  accountsView,
  categoriesView,
  dashboardView,
  deletedAccountsView,
  deletedCategoriesView,
  entriesListView,
  entryDetailView,
  entryFormView,
  escapeHtml,
  loginView,
  notFoundView,
  profileView,
  recurrenceFormView,
  recurrencesListView,
  settingsView,
};
