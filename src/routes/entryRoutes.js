const Account = require("../models/FinancialAccount");
const AuditLog = require("../models/AuditLog");
const Category = require("../models/Category");
const Entry = require("../models/FinancialEntry");
const Recurrence = require("../models/Recurrence");
const { entriesCsv } = require("../services/csvService");
const { dueDateFromCompetence, normalizeCompetence } = require("../services/dateService");
const { logBusinessError } = require("../services/errorLogging");
const { entryDetail, entryForm } = require("../services/financialEntryView");
const { isValidationError } = require("../services/formValidation");
const { logWarn } = require("../services/operationalLogger");
const {
  queryValue,
  redirect,
  requestDetails,
  sendHtml,
} = require("../services/http");
const {
  entriesListView,
  notFoundView,
} = require("../services/viewEngine");

function registerEntryRoutes(app, { requireCsrf }) {
  app.get("/entries", (req, res) => {
    const user = req.user;
    const competence = normalizeCompetence(queryValue(req, "competence"), user.timezone);
    const filters = entryFilters(req, competence);
    Recurrence.generateForCompetence(user, competence);

    return sendHtml(
      res,
      entriesListView({
        user,
        competence,
        entries: Entry.list(user, filters),
        filters,
        categories: Category.list(user.id),
        accounts: Account.active(user.id),
        notifications: entriesNotifications(req),
      })
    );
  });

  app.get("/entries/export.csv", (req, res) => {
    const user = req.user;
    const competence = normalizeCompetence(queryValue(req, "competence"), user.timezone);
    const filters = entryFilters(req, competence);
    Recurrence.generateForCompetence(user, competence);
    const entries = Entry.list(user, filters);
    AuditLog.record(user.id, "financial_entries", `${user.id}:${competence}`, "exported_csv", {
      competence,
      filters: {
        q: filters.q,
        entry_type: filters.entry_type,
        status: filters.status,
        category_id: filters.category_id,
        account_id: filters.account_id,
      },
      record_count: entries.length,
    });
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="emdia-lancamentos-${competence}.csv"`);
    return res.status(200).send(entriesCsv(entries));
  });

  app.get("/entries/new", (req, res) => {
    const user = req.user;
    const competence = normalizeCompetence(queryValue(req, "competence"), user.timezone);
    const entry = {
      entry_type: "EXPENSE",
      competence_month: competence,
      due_date: dueDateFromCompetence(competence, 10),
      expected_amount_cents: 0,
      realized_amount_cents: 0,
    };

    return sendHtml(res, entryForm(user, { entry, competence, action: "/entries" }));
  });

  app.get("/entries/:id", (req, res) => {
    const user = req.user;
    const entry = Entry.getById(user.id, req.params.id);
    if (!entry) return sendHtml(res, notFoundView(user), 404);

    return sendHtml(res, entryDetail(user, entry, {
      competence: queryValue(req, "competence"),
      returnTo: queryValue(req, "return_to"),
    }));
  });

  app.get("/entries/:id/edit", (req, res) => {
    const user = req.user;
    const entry = Entry.getById(user.id, req.params.id);
    if (!entry) return sendHtml(res, notFoundView(user), 404);

    return sendHtml(res, entryForm(user, {
      entry,
      competence: entry.competence_month,
      action: `/entries/${entry.id}`,
    }));
  });

  app.post("/entries", requireCsrf, (req, res) => {
    try {
      const entry = Entry.create(req.user, req.body);
      return redirect(res, `/entries?competence=${entry.competence_month}`);
    } catch (error) {
      if (isValidationError(error)) {
        const competence = normalizeCompetence(req.body.competence_month, req.user.timezone);
        return sendHtml(
          res,
          entryForm(req.user, {
            action: "/entries",
            competence,
            entry: error.values,
            errors: error.errors,
          }),
          400
        );
      }

      logBusinessError(req, "business.financial_entry.save_failed", "Falha ao salvar lançamento.", error, {
        entity: "financial_entry",
        competenceMonth: req.body.competence_month,
      });
      throw error;
    }
  });

  app.post("/entries/month/delete", requireCsrf, (req, res) => {
    try {
      const result = Entry.deleteMonth(req.user, req.body);
      return redirect(res, `/entries?competence=${result.competence}&deleted_count=${result.deletedCount}`);
    } catch (error) {
      if (isValidationError(error)) {
        const competence = normalizeCompetence(req.body.competence_month, req.user.timezone);
        const filters = entryFilters({}, competence);

        return sendHtml(
          res,
          entriesListView({
            user: req.user,
            competence,
            entries: Entry.list(req.user, filters),
            filters,
            categories: Category.list(req.user.id),
            accounts: Account.active(req.user.id),
            deleteMonthErrors: error.errors,
            deleteMonthValues: error.values,
            deleteMonthOpen: true,
            notifications: [{ type: "error", message: "A exclusão não foi executada. Revise a confirmação." }],
          }),
          400
        );
      }

      logBusinessError(req, "business.financial_entries.month_delete_failed", "Falha ao excluir lançamentos do mês.", error, {
        entity: "financial_entries",
        competenceMonth: req.body.competence_month,
      });
      throw error;
    }
  });

  app.post("/entries/:id", requireCsrf, (req, res) => {
    try {
      const entry = Entry.update(req.user, req.params.id, req.body);
      const competence = entry
        ? entry.competence_month
        : normalizeCompetence(req.body.competence_month, req.user.timezone);
      if (!entry) {
        logWarn("business.not_found", "Lançamento não encontrado para atualização.", {
          user: req.user,
          entity: "financial_entry",
          entityId: req.params.id,
          competenceMonth: competence,
          details: requestDetails(req),
        });
      }
      return redirect(res, `/entries?competence=${competence}`);
    } catch (error) {
      if (isValidationError(error)) {
        const existing = Entry.getById(req.user.id, req.params.id);
        const competence = normalizeCompetence(
          req.body.competence_month || existing?.competence_month,
          req.user.timezone
        );
        return sendHtml(
          res,
          entryForm(req.user, {
            action: `/entries/${req.params.id}`,
            competence,
            entry: { ...(existing || {}), ...error.values, id: req.params.id },
            errors: error.errors,
          }),
          400
        );
      }

      logBusinessError(req, "business.financial_entry.save_failed", "Falha ao atualizar lançamento.", error, {
        entity: "financial_entry",
        entityId: req.params.id,
        competenceMonth: req.body.competence_month,
      });
      throw error;
    }
  });

  app.post("/entries/:id/cancel", requireCsrf, (req, res) => {
    const entry = Entry.getById(req.user.id, req.params.id);
    Entry.cancel(req.user, req.params.id);
    const competence = entry ? entry.competence_month : normalizeCompetence("", req.user.timezone);
    return redirect(res, `/entries?competence=${competence}`);
  });

  app.post("/entries/:id/duplicate", requireCsrf, (req, res) => {
    const entry = Entry.duplicate(req.user, req.params.id);
    if (entry) {
      AuditLog.record(req.user.id, "financial_entry", entry.id, "duplicated", {
        source_entry_id: req.params.id,
      });
    }
    const competence = entry ? entry.competence_month : normalizeCompetence("", req.user.timezone);
    return redirect(res, `/entries?competence=${competence}`);
  });
}

function entryFilters(req, competence) {
  return {
    competence,
    q: req.query ? queryValue(req, "q") : "",
    entry_type: req.query ? queryValue(req, "entry_type") : "",
    status: req.query ? queryValue(req, "status") : "",
    category_id: req.query ? queryValue(req, "category_id") : "",
    account_id: req.query ? queryValue(req, "account_id") : "",
  };
}

function entriesNotifications(req) {
  const deletedCount = queryValue(req, "deleted_count");
  if (!deletedCount) return [];

  const count = Math.max(Number(deletedCount) || 0, 0);
  if (count === 0) {
    return [{ type: "info", message: "Nenhum lançamento foi encontrado para excluir nesta competência." }];
  }

  return [
    {
      type: "success",
      message: `${count} ${count === 1 ? "lançamento removido" : "lançamentos removidos"} da competência selecionada.`,
    },
  ];
}

module.exports = {
  registerEntryRoutes,
};
