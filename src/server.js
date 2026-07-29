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
const { registerSettlementRoutes } = require("./routes/settlementRoutes");

function createServer() {
  const app = express();

  app.set("trust proxy", "loopback");
  app.use("/public", express.static(path.join(__dirname, "..", "public")));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(markResponseFormat);

  registerPublicOperationalRoutes(app);

  app.use(loadSession);
  registerPublicAuthRoutes(app);

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
