const { logError } = require("./operationalLogger");
const { requestDetails } = require("./http");

function logBusinessError(req, event, message, error, context = {}) {
  logError(event, message, {
    user: req.user,
    entity: context.entity,
    entityId: context.entityId,
    competenceMonth: context.competenceMonth,
    details: {
      ...requestDetails(req),
      error: errorDetails(error),
    },
  });
}

function errorDetails(error) {
  if (!error || typeof error !== "object") {
    return { message: String(error || "Erro desconhecido") };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

module.exports = {
  errorDetails,
  logBusinessError,
};
