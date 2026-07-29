const { randomBytes } = require("node:crypto");
const { logError, logWarn } = require("../services/operationalLogger");
const { errorDetails } = require("../services/errorLogging");
const { requestDetails, sendHtml, sendJson } = require("../services/http");
const { notFoundView, unexpectedErrorView } = require("../services/viewEngine");

const JSON_RESPONSE_PATHS = new Set([
  "/health",
  "/ready",
  "/settings/whatsapp-status",
  "/operational-logs/events",
]);

function markResponseFormat(req, res, next) {
  if (JSON_RESPONSE_PATHS.has(req.path)) {
    res.locals.responseFormat = "json";
  }
  return next();
}

function notFoundOrMethodNotAllowed(req, res) {
  if (req.method === "GET") {
    logWarn("business.not_found", "Rota não encontrada.", {
      user: req.user,
      details: requestDetails(req),
    });
    return sendHtml(res, notFoundView(req.user), 404);
  }

  logWarn("business.operation.rejected", "Método não permitido.", {
    user: req.user,
    details: requestDetails(req),
  });
  return sendJson(res, { error: "Método não permitido" }, 405);
}

function unexpectedErrorHandler(err, req, res, next) {
  const errorId = createErrorId();

  logError("app.unexpected_error", "Falha inesperada ao processar requisição.", {
    user: req.user,
    requestId: errorId,
    details: {
      ...requestDetails(req),
      error: errorDetails(err),
    },
  });

  if (res.headersSent) return next(err);

  if (res.locals.responseFormat === "json") {
    return sendJson(
      res,
      {
        error: "Não foi possível concluir a operação.",
        error_id: errorId,
      },
      500
    );
  }

  return sendHtml(
    res,
    unexpectedErrorView({
      user: req.user || null,
      errorId,
    }),
    500
  );
}

function createErrorId() {
  return `ERR-${randomBytes(6).toString("hex").toUpperCase()}`;
}

module.exports = {
  markResponseFormat,
  notFoundOrMethodNotAllowed,
  unexpectedErrorHandler,
};
