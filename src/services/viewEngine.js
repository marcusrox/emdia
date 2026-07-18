const { accountsView, deletedAccountsView } = require("../views/accountsView");
const { auditView } = require("../views/auditView");
const { categoriesView, deletedCategoriesView } = require("../views/categoriesView");
const { dashboardView } = require("../views/dashboardView");
const { entriesListView, entryDetailView, entryFormView } = require("../views/entriesView");
const { loginView } = require("../views/authView");
const { notFoundView } = require("../views/errorsView");
const { operationalLogsView } = require("../views/operationalLogsView");
const { notificationQueueView } = require("../views/notificationQueueView");
const { profileView } = require("../views/profileView");
const { recurrenceFormView, recurrencesListView } = require("../views/recurrencesView");
const { runtimeEnvironmentView } = require("../views/runtimeEnvironmentView");
const { settingsView } = require("../views/settingsView");
const { userAdminFormView, usersAdminListView } = require("../views/usersAdminView");
const { escapeHtml } = require("./viewHelpers");

module.exports = {
  accountsView,
  auditView,
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
  operationalLogsView,
  notificationQueueView,
  profileView,
  recurrenceFormView,
  recurrencesListView,
  runtimeEnvironmentView,
  settingsView,
  userAdminFormView,
  usersAdminListView,
};
