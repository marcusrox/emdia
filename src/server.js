const express = require("express");
const path = require("node:path");
const {
  loadSession,
  requireAdmin,
  requireAuth,
  requireCsrf,
} = require("./middleware/auth");
const {
  markResponseFormat,
  notFoundOrMethodNotAllowed,
  unexpectedErrorHandler,
} = require("./middleware/errors");
const { securityHeaders } = require("./middleware/securityHeaders");
const { registerAccountRoutes } = require("./routes/accountRoutes");
const { registerAdminRoutes } = require("./routes/adminRoutes");
const {
  registerProtectedAuthRoutes,
  registerPublicAuthRoutes,
} = require("./routes/authRoutes");
const { registerCategoryRoutes } = require("./routes/categoryRoutes");
const { registerDashboardRoutes } = require("./routes/dashboardRoutes");
const { registerEntryRoutes } = require("./routes/entryRoutes");
const {
  registerProtectedOperationalRoutes,
  registerPublicOperationalRoutes,
} = require("./routes/operationalRoutes");
const { registerProfileRoutes } = require("./routes/profileRoutes");
const { registerRecurrenceRoutes } = require("./routes/recurrenceRoutes");
const { registerReceiptImportRoutes } = require("./routes/receiptImportRoutes");
const { registerSettlementRoutes } = require("./routes/settlementRoutes");
const { registerWhatsAppWebhookRoutes } = require("./routes/whatsappWebhookRoutes");
const { createLoginRateLimiter } = require("./services/loginRateLimitService");
const { createSignupRateLimiter } = require("./services/signupRateLimitService");
const { checkReadiness } = require("./services/readinessService");

function createServer(options = {}) {
  const app = express();
  const loginRateLimiter = options.loginRateLimiter || createLoginRateLimiter();
  const signupRateLimiter = options.signupRateLimiter || createSignupRateLimiter();
  const readinessCheck = options.readinessCheck || checkReadiness;

  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use(securityHeaders);
  app.use(markResponseFormat);
  registerWhatsAppWebhookRoutes(app, options.whatsappWebhook || {});
  app.use("/public", express.static(path.join(__dirname, "..", "public")));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  registerPublicOperationalRoutes(app, { readinessCheck });

  app.use(loadSession);
  registerPublicAuthRoutes(app, { loginRateLimiter, signupRateLimiter });

  app.use(requireAuth);

  const protectedMiddleware = {
    requireAdmin,
    requireCsrf,
  };

  registerProtectedAuthRoutes(app, protectedMiddleware);
  registerDashboardRoutes(app);
  registerAccountRoutes(app, protectedMiddleware);
  registerCategoryRoutes(app, protectedMiddleware);
  registerProfileRoutes(app, protectedMiddleware);
  registerRecurrenceRoutes(app, protectedMiddleware);
  registerReceiptImportRoutes(app, protectedMiddleware);
  registerEntryRoutes(app, protectedMiddleware);
  registerSettlementRoutes(app, protectedMiddleware);
  registerAdminRoutes(app, protectedMiddleware);
  registerProtectedOperationalRoutes(app, protectedMiddleware);

  app.use(notFoundOrMethodNotAllowed);
  app.use(unexpectedErrorHandler);

  return app;
}

module.exports = {
  createServer,
  unexpectedErrorHandler,
};
