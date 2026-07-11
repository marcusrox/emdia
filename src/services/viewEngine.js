const fs = require("node:fs");
const path = require("node:path");
const { accountsView } = require("../views/accountsView");
const { categoriesView } = require("../views/categoriesView");
const { dashboardView } = require("../views/dashboardView");
const { entriesListView, entryDetailView, entryFormView } = require("../views/entriesView");
const { loginView } = require("../views/authView");
const { notFoundView } = require("../views/errorsView");
const { settingsView } = require("../views/settingsView");
const { escapeHtml } = require("./viewHelpers");

function staticFile(filePath) {
  return fs.readFileSync(path.join(__dirname, "..", "..", filePath));
}

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
  staticFile,
};
