const Account = require("../models/FinancialAccount");
const { redirect, sendHtml } = require("../services/http");
const {
  accountsView,
  deletedAccountsView,
  notFoundView,
} = require("../services/viewEngine");

function registerAccountRoutes(app, { requireCsrf }) {
  app.get("/accounts", (req, res) => {
    return sendHtml(res, accountsView({ user: req.user, accounts: Account.list(req.user.id) }));
  });

  app.get("/accounts/deleted", (req, res) => {
    return sendHtml(res, deletedAccountsView({ user: req.user, accounts: Account.listDeleted(req.user.id) }));
  });

  app.get("/accounts/:id/edit", (req, res) => {
    const account = Account.getById(req.user.id, req.params.id);
    if (!account) return sendHtml(res, notFoundView(req.user), 404);

    return sendHtml(
      res,
      accountsView({
        user: req.user,
        accounts: Account.list(req.user.id),
        account,
        action: `/accounts/${account.id}`,
      })
    );
  });

  app.post("/accounts", requireCsrf, (req, res) => {
    Account.create(req.user.id, req.body);
    return redirect(res, "/accounts");
  });

  app.post("/accounts/:id", requireCsrf, (req, res) => {
    Account.update(req.user.id, req.params.id, req.body);
    return redirect(res, "/accounts");
  });

  app.post("/accounts/:id/delete", requireCsrf, (req, res) => {
    Account.softDelete(req.user.id, req.params.id);
    return redirect(res, "/accounts");
  });

  app.post("/accounts/:id/restore", requireCsrf, (req, res) => {
    Account.restore(req.user.id, req.params.id);
    return redirect(res, "/accounts/deleted");
  });
}

module.exports = {
  registerAccountRoutes,
};
