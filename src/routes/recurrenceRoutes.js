const Account = require("../models/FinancialAccount");
const Category = require("../models/Category");
const Recurrence = require("../models/Recurrence");
const { isValidationError } = require("../services/formValidation");
const { redirect, sendHtml } = require("../services/http");
const {
  notFoundView,
  recurrenceFormView,
  recurrencesListView,
} = require("../services/viewEngine");

function registerRecurrenceRoutes(app, { requireCsrf }) {
  app.get("/recurrences", (req, res) => {
    return sendHtml(res, recurrencesListView({ user: req.user, recurrences: Recurrence.list(req.user.id) }));
  });

  app.get("/recurrences/new", (req, res) => {
    return sendHtml(res, recurrenceForm(req.user, { action: "/recurrences" }));
  });

  app.get("/recurrences/:id/edit", (req, res) => {
    const recurrence = Recurrence.getById(req.user.id, req.params.id);
    if (!recurrence) return sendHtml(res, notFoundView(req.user), 404);

    return sendHtml(res, recurrenceForm(req.user, { recurrence, action: `/recurrences/${recurrence.id}` }));
  });

  app.post("/recurrences", requireCsrf, (req, res) => {
    try {
      Recurrence.create(req.user, req.body);
      return redirect(res, "/recurrences");
    } catch (error) {
      if (isValidationError(error)) {
        return sendHtml(
          res,
          recurrenceForm(req.user, {
            action: "/recurrences",
            recurrence: error.values,
            errors: error.errors,
          }),
          400
        );
      }

      throw error;
    }
  });

  app.post("/recurrences/:id", requireCsrf, (req, res) => {
    try {
      Recurrence.update(req.user, req.params.id, req.body);
      return redirect(res, "/recurrences");
    } catch (error) {
      if (isValidationError(error)) {
        const existing = Recurrence.getById(req.user.id, req.params.id);
        return sendHtml(
          res,
          recurrenceForm(req.user, {
            action: `/recurrences/${req.params.id}`,
            recurrence: { ...(existing || {}), ...error.values, id: req.params.id },
            errors: error.errors,
          }),
          400
        );
      }

      throw error;
    }
  });

  app.post("/recurrences/:id/pause", requireCsrf, (req, res) => {
    Recurrence.pause(req.user, req.params.id);
    return redirect(res, "/recurrences");
  });

  app.post("/recurrences/:id/activate", requireCsrf, (req, res) => {
    Recurrence.activate(req.user, req.params.id);
    return redirect(res, "/recurrences");
  });

  app.post("/recurrences/:id/end", requireCsrf, (req, res) => {
    Recurrence.end(req.user, req.params.id);
    return redirect(res, "/recurrences");
  });
}

function recurrenceForm(user, { recurrence = null, action, errors = {} }) {
  return recurrenceFormView({
    user,
    recurrence,
    categories: Category.list(user.id),
    accounts: Account.active(user.id),
    action,
    errors,
  });
}

module.exports = {
  registerRecurrenceRoutes,
};
