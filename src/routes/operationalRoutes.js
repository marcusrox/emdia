const { listOperationalLogs } = require("../services/operationalLogReader");
const { collectRuntimeEnvironment } = require("../services/runtimeEnvironmentService");
const { logWarn } = require("../services/operationalLogger");
const { queryValue, sendHtml, sendJson } = require("../services/http");
const {
  operationalLogsView,
  runtimeEnvironmentView,
} = require("../services/viewEngine");

function registerPublicOperationalRoutes(app, { readinessCheck }) {
  app.all("/health", (req, res) => {
    return sendJson(res, { ok: true, service: "emdia" });
  });

  app.all("/ready", (req, res) => {
    const result = readinessCheck();
    if (!result.ok) {
      logWarn("app.readiness.failed", "Readiness da aplicação falhou.", {
        details: { reason: result.reason },
      });
    }
    return sendJson(res, result.payload, result.ok ? 200 : 503);
  });
}

function registerProtectedOperationalRoutes(app, { requireAdmin }) {
  app.get("/operational-logs", requireAdmin, (req, res) => {
    const result = listOperationalLogs(operationalLogFilters(req));

    return sendHtml(
      res,
      operationalLogsView({
        user: req.user,
        entries: result.entries,
        filters: result.filters,
        dates: result.dates,
      })
    );
  });

  app.get("/operational-logs/events", requireAdmin, (req, res) => {
    const result = listOperationalLogs(operationalLogFilters(req));

    return sendJson(res, {
      entries: result.entries,
      filters: result.filters,
      dates: result.dates,
    });
  });

  app.get("/runtime-environment", requireAdmin, (req, res) => {
    return sendHtml(
      res,
      runtimeEnvironmentView({
        user: req.user,
        environment: collectRuntimeEnvironment(req.user),
      })
    );
  });
}

function operationalLogFilters(req) {
  return {
    date: queryValue(req, "date"),
    level: queryValue(req, "level"),
    event: queryValue(req, "event"),
    q: queryValue(req, "q"),
    since: queryValue(req, "since"),
    limit: queryValue(req, "limit"),
  };
}

module.exports = {
  registerProtectedOperationalRoutes,
  registerPublicOperationalRoutes,
};
