const express = require("express");
const path = require("node:path");
const Account = require("./models/FinancialAccount");
const AuditLog = require("./models/AuditLog");
const Category = require("./models/Category");
const Entry = require("./models/FinancialEntry");
const Recurrence = require("./models/Recurrence");
const Settlement = require("./models/Settlement");
const User = require("./models/User");
const { dueDateFromCompetence, normalizeCompetence } = require("./services/dateService");
const Auth = require("./services/authService");
const { logError, logInfo, logWarn } = require("./services/operationalLogger");
const {
  accountsView,
  auditView,
  categoriesView,
  dashboardView,
  deletedAccountsView,
  deletedCategoriesView,
  entriesListView,
  entryDetailView,
  entryFormView,
  loginView,
  notFoundView,
  profileView,
  recurrenceFormView,
  recurrencesListView,
  settingsView,
} = require("./services/viewEngine");

function createServer() {
  const app = express();

  app.use("/public", express.static(path.join(__dirname, "..", "public")));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.all(["/health", "/ready"], (req, res) => {
    return sendJson(res, { ok: true, service: "emdia" });
  });

  app.use(loadSession);

  app.get("/login", (req, res) => {
    return req.user ? redirect(res, "/dashboard") : sendHtml(res, loginView({ email: "" }));
  });

  app.post("/login", (req, res) => {
    return handleLogin(req, res, req.body);
  });

  app.use(requireAuth);

  app.post("/logout", requireCsrf, (req, res) => {
    logInfo("auth.logout", "Logout realizado.", { user: req.user });
    Auth.invalidateSession(req);
    res.set("Set-Cookie", Auth.clearSessionCookie());
    return redirect(res, "/login");
  });

  app.get("/", (req, res) => {
    return redirect(res, "/dashboard");
  });

  app.get("/dashboard", (req, res) => {
    const user = req.user;
    const competence = normalizeCompetence(queryValue(req, "competence"), user.timezone);
    Recurrence.generateForCompetence(user, competence);
    return sendHtml(res, dashboardView({ user, competence, dashboard: Entry.dashboard(user, competence) }));
  });

  app.get("/entries", (req, res) => {
    const user = req.user;
    const competence = normalizeCompetence(queryValue(req, "competence"), user.timezone);
    const filters = {
      competence,
      q: queryValue(req, "q"),
      entry_type: queryValue(req, "entry_type"),
      status: queryValue(req, "status"),
      category_id: queryValue(req, "category_id"),
      account_id: queryValue(req, "account_id"),
    };
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
      })
    );
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

    return sendHtml(res, entryDetail(user, entry));
  });

  app.get("/entries/:id/edit", (req, res) => {
    const user = req.user;
    const entry = Entry.getById(user.id, req.params.id);
    if (!entry) return sendHtml(res, notFoundView(user), 404);

    return sendHtml(res, entryForm(user, { entry, competence: entry.competence_month, action: `/entries/${entry.id}` }));
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

  app.post("/entries/:id", requireCsrf, (req, res) => {
    try {
      const entry = Entry.update(req.user, req.params.id, req.body);
      const competence = entry ? entry.competence_month : normalizeCompetence(req.body.competence_month, req.user.timezone);
      if (!entry) {
        logWarn("business.not_found", "Lançamento não encontrado para atualização.", {
          user: req.user,
          entity: "financial_entry",
          entityId: req.params.id,
          competenceMonth: competence,
        });
      }
      return redirect(res, `/entries?competence=${competence}`);
    } catch (error) {
      if (isValidationError(error)) {
        const existing = Entry.getById(req.user.id, req.params.id);
        const competence = normalizeCompetence(req.body.competence_month || existing?.competence_month, req.user.timezone);
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
      AuditLog.record(req.user.id, "financial_entry", entry.id, "duplicated", { source_entry_id: req.params.id });
    }
    const competence = entry ? entry.competence_month : normalizeCompetence("", req.user.timezone);
    return redirect(res, `/entries?competence=${competence}`);
  });

  app.post("/entries/:id/settlements", requireCsrf, (req, res) => {
    try {
      const entry = Entry.settle(req.user, req.params.id, req.body);
      if (!entry) {
        logWarn("business.not_found", "Lançamento não encontrado para baixa.", {
          user: req.user,
          entity: "financial_entry",
          entityId: req.params.id,
        });
      }
      return redirect(res, entry ? `/entries/${entry.id}` : "/entries");
    } catch (error) {
      if (isValidationError(error)) {
        const entry = Entry.getById(req.user.id, req.params.id);
        if (!entry) return sendHtml(res, notFoundView(req.user), 404);

        return sendHtml(
          res,
          entryDetail(req.user, entry, {
            settlementErrors: error.errors,
            settlementValues: error.values,
          }),
          400
        );
      }

      logBusinessError(req, "business.settlement.save_failed", "Falha ao registrar baixa.", error, {
        entity: "financial_entry",
        entityId: req.params.id,
      });
      throw error;
    }
  });

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

  app.get("/categories", (req, res) => {
    return sendHtml(res, categoriesView({ user: req.user, categories: Category.list(req.user.id) }));
  });

  app.get("/categories/deleted", (req, res) => {
    return sendHtml(res, deletedCategoriesView({ user: req.user, categories: Category.listDeleted(req.user.id) }));
  });

  app.get("/categories/:id/edit", (req, res) => {
    const category = Category.getById(req.user.id, req.params.id);
    if (!category) return sendHtml(res, notFoundView(req.user), 404);

    return sendHtml(
      res,
      categoriesView({
        user: req.user,
        categories: Category.list(req.user.id),
        category,
        action: `/categories/${category.id}`,
      })
    );
  });

  app.post("/categories", requireCsrf, (req, res) => {
    Category.create(req.user.id, req.body);
    return redirect(res, "/categories");
  });

  app.post("/categories/:id", requireCsrf, (req, res) => {
    Category.update(req.user.id, req.params.id, req.body);
    return redirect(res, "/categories");
  });

  app.post("/categories/:id/delete", requireCsrf, (req, res) => {
    Category.softDelete(req.user.id, req.params.id);
    return redirect(res, "/categories");
  });

  app.post("/categories/:id/restore", requireCsrf, (req, res) => {
    Category.restore(req.user.id, req.params.id);
    return redirect(res, "/categories/deleted");
  });

  app.get("/profile", (req, res) => {
    return sendHtml(res, profileView({ user: req.user, saved: queryValue(req, "saved") === "1" }));
  });

  app.post("/profile", requireCsrf, (req, res) => {
    const result = User.updateProfile(req.user.id, req.body);
    if (!result.ok) {
      logWarn("business.validation.failed", "Validação de perfil falhou.", {
        user: req.user,
        entity: "user",
        entityId: req.user.id,
        details: {
          fields: Object.keys(result.errors || {}),
        },
      });
      const profile = { ...req.user, ...result.profile };
      return sendHtml(res, profileView({ user: req.user, profile, errors: result.errors }), 400);
    }

    AuditLog.record(req.user.id, "user", req.user.id, "profile_updated", {
      name: result.user.name,
      email: result.user.email,
      password_changed: Boolean(req.body.new_password),
    });
    return redirect(res, "/profile?saved=1");
  });

  app.get("/settings", (req, res) => {
    return sendHtml(res, settingsView({ user: req.user, saved: queryValue(req, "saved") === "1" }));
  });

  app.post("/settings", requireCsrf, (req, res) => {
    User.updateInterfacePreferences(req.user.id, req.body);
    AuditLog.record(req.user.id, "settings", req.user.id, "settings_updated", {
      font_scale: req.body.font_scale,
      list_density: req.body.list_density,
    });
    logInfo("sensitive.settings.updated", "Preferências de interface atualizadas.", {
      user: req.user,
      entity: "user",
      entityId: req.user.id,
    });
    return redirect(res, "/settings?saved=1");
  });

  app.get("/audit", (req, res) => {
    const filters = {
      from_date: queryValue(req, "from_date"),
      to_date: queryValue(req, "to_date"),
      entity_type: queryValue(req, "entity_type"),
      action: queryValue(req, "action"),
      q: queryValue(req, "q"),
    };

    return sendHtml(res, auditView({ user: req.user, entries: AuditLog.list(req.user.id, filters), filters }));
  });

  app.use((req, res) => {
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
  });

  app.use((err, req, res, next) => {
    logError("business.operation.rejected", "Operação rejeitada por erro funcional ou técnico.", {
      user: req.user,
      details: {
        ...requestDetails(req),
        error: errorDetails(err),
      },
    });
    console.error(err);
    if (res.headersSent) return next(err);

    return sendHtml(
      res,
      `<h1>Erro no EmDia</h1><p>${String(err.message || err)}</p><p><a href="/dashboard">Voltar ao dashboard</a></p>`,
      500
    );
  });

  return app;
}

function loadSession(req, res, next) {
  User.ensureDefaultUser();
  const session = Auth.getSession(req);
  const user = session ? sessionUser(session) : null;

  if (user) {
    user.csrfToken = Auth.csrfToken(req);
    req.user = user;
    return next();
  }

  if (canUseDevelopmentLogin(req)) {
    return startDevelopmentSession(req, res);
  }

  req.user = null;
  return next();
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  logWarn("auth.access.denied", "Acesso negado a rota protegida sem autenticação.", {
    details: requestDetails(req),
  });
  return redirect(res, "/login");
}

function requireCsrf(req, res, next) {
  if (Auth.verifyCsrf(req, req.body)) return next();
  logWarn("sensitive.route.forbidden", "Requisição bloqueada por token CSRF inválido.", {
    user: req.user,
    details: requestDetails(req),
  });
  return sendHtml(res, "<h1>Requisição inválida</h1><p>Atualize a página e tente novamente.</p>", 403);
}

function sessionUser(session) {
  return {
    id: session.user_id,
    name: session.name,
    email: session.email,
    timezone: session.timezone,
    locale: session.locale,
    is_active: session.is_active,
    font_scale: User.normalizeFontScale(session.font_scale),
    list_density: User.normalizeListDensity(session.list_density),
  };
}

function handleLogin(req, res, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const user = User.findByEmail(email);

  if (!user || !Auth.verifyPassword(password, user.password_hash)) {
    logWarn("auth.login.failed", "Falha de login.", {
      details: {
        emailProvided: Boolean(email),
        ...requestDetails(req),
      },
    });
    return sendHtml(res, loginView({ email, error: "E-mail ou senha inválidos." }), 401);
  }

  const session = Auth.createSession(user.id);
  logInfo("auth.login.success", "Login realizado com sucesso.", { user });
  res.set("Set-Cookie", session.cookie);
  return redirect(res, "/dashboard");
}

function canUseDevelopmentLogin(req) {
  return process.env.NODE_ENV === "development" && req.method === "GET" && isLocalhostRequest(req);
}

function isLocalhostRequest(req) {
  const host = normalizeHost(req.headers.host);
  const remoteAddress = String(req.socket.remoteAddress || "").toLowerCase();
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  const localAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

  return localHosts.has(host) && localAddresses.has(remoteAddress);
}

function normalizeHost(hostHeader) {
  const host = String(hostHeader || "").toLowerCase();
  if (host.startsWith("[")) {
    const closingBracket = host.indexOf("]");
    return closingBracket === -1 ? host : host.slice(1, closingBracket);
  }

  return host.split(":")[0];
}

function startDevelopmentSession(req, res) {
  const devUser = User.ensureDefaultUser();
  const session = Auth.createSession(devUser.id);
  const nextPath = req.path === "/login" ? "/dashboard" : req.originalUrl;

  logInfo("auth.login.success", "Login de desenvolvimento realizado.", {
    user: devUser,
    details: {
      mode: "development",
      nextPath,
    },
  });
  res.set("Set-Cookie", session.cookie);
  return redirect(res, nextPath);
}

function queryValue(req, name) {
  const value = req.query[name];
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
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

function entryForm(user, { entry = null, competence, action, errors = {} }) {
  return entryFormView({
    user,
    entry,
    competence,
    categories: Category.list(user.id),
    accounts: Account.active(user.id),
    action,
    errors,
  });
}

function entryDetail(user, entry, { settlementErrors = {}, settlementValues = null } = {}) {
  return entryDetailView({
    user,
    entry,
    settlements: Settlement.listByEntry(entry.id),
    accounts: Account.active(user.id),
    auditEvents: AuditLog.listEntityHistory(user.id, "financial_entry", entry.id),
    settlementErrors,
    settlementValues,
  });
}

function isValidationError(error) {
  return error?.name === "ValidationError" && error.errors;
}

function sendHtml(res, html, statusCode = 200) {
  return res.status(statusCode).type("html").send(html);
}

function redirect(res, location) {
  return res.redirect(303, location);
}

function sendJson(res, payload, statusCode = 200) {
  return res.status(statusCode).type("json").send(JSON.stringify(payload, null, 2));
}

function requestDetails(req) {
  return {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
  };
}

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
  };
}

module.exports = {
  createServer,
};
