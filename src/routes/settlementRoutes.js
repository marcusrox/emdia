const Entry = require("../models/FinancialEntry");
const Settlement = require("../models/Settlement");
const { logBusinessError } = require("../services/errorLogging");
const { entryDetail } = require("../services/financialEntryView");
const { isValidationError } = require("../services/formValidation");
const { logWarn } = require("../services/operationalLogger");
const {
  redirect,
  requestDetails,
  sendHtml,
} = require("../services/http");
const { notFoundView } = require("../services/viewEngine");

function registerSettlementRoutes(app, { requireCsrf }) {
  app.post("/entries/:id/settlements", requireCsrf, (req, res) => {
    try {
      const entry = Entry.settle(req.user, req.params.id, req.body);
      if (!entry) {
        logWarn("business.not_found", "Lançamento não encontrado para baixa.", {
          user: req.user,
          entity: "financial_entry",
          entityId: req.params.id,
          details: requestDetails(req),
        });
      }
      return redirect(res, entry ? `/entries/${entry.id}` : "/entries");
    } catch (error) {
      if (isValidationError(error)) {
        const entry = Entry.getById(req.user.id, req.params.id);
        if (!entry) return sendHtml(res, notFoundView(req.user), 404);

        if (error.code === "SETTLEMENT_NOT_ALLOWED") {
          logWarn("business.settlement.blocked", "Tentativa de baixa bloqueada.", {
            user: req.user,
            entity: "financial_entry",
            entityId: req.params.id,
            details: requestDetails(req, { reason: error.reason || "unknown" }),
          });
        }

        return sendHtml(
          res,
          entryDetail(req.user, entry, {
            settlementErrors: error.errors,
            settlementValues: error.values,
          }),
          error.statusCode || 400
        );
      }

      logBusinessError(req, "business.settlement.save_failed", "Falha ao registrar baixa.", error, {
        entity: "financial_entry",
        entityId: req.params.id,
      });
      throw error;
    }
  });

  app.post("/settlements/:id/reverse", requireCsrf, (req, res) => {
    try {
      const entry = Entry.reverseSettlement(req.user, req.params.id, req.body);
      if (!entry) return sendHtml(res, notFoundView(req.user), 404);
      return redirect(res, `/entries/${entry.id}`);
    } catch (error) {
      if (isValidationError(error)) {
        const settlement = Settlement.getActiveForUser(req.user.id, req.params.id);
        if (!settlement) return sendHtml(res, notFoundView(req.user), 404);
        const entry = Entry.getById(req.user, settlement.financial_entry_id);
        if (!entry) return sendHtml(res, notFoundView(req.user), 404);
        return sendHtml(res, entryDetail(req.user, entry, {
          reversalErrors: { [req.params.id]: error.errors },
          reversalValues: { [req.params.id]: error.values },
        }), error.statusCode || 400);
      }
      logBusinessError(req, "business.settlement.reverse_failed", "Falha ao estornar baixa.", error, {
        entity: "settlement", entityId: req.params.id,
      });
      throw error;
    }
  });
}

module.exports = {
  registerSettlementRoutes,
};
