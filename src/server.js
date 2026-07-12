const express = require("express");
const path = require("node:path");
const Account = require("./models/FinancialAccount");
const Category = require("./models/Category");
const Entry = require("./models/FinancialEntry");
const Settlement = require("./models/Settlement");
const User = require("./models/User");
const { dueDateFromCompetence, normalizeCompetence } = require("./services/dateService");
const Auth = require("./services/authService");
const {
  accountsView,
  categoriesView,
  dashboardView,
  entriesListView,
  entryDetailView,
  entryFormView,
  loginView,
  notFoundView,
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
    return handleLogin(res, req.body);
  });

  app.use(requireAuth);

  app.post("/logout", requireCsrf, (req, res) => {
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

    return sendHtml(
      res,
      entryFormView({
        user,
        entry,
        competence,
        categories: Category.list(user.id),
        accounts: Account.active(user.id),
        action: "/entries",
      })
    );
  });

  app.get("/entries/:id", (req, res) => {
    const user = req.user;
    const entry = Entry.getById(user.id, req.params.id);
    if (!entry) return sendHtml(res, notFoundView(user), 404);

    return sendHtml(
      res,
      entryDetailView({
        user,
        entry,
        settlements: Settlement.listByEntry(entry.id),
        accounts: Account.active(user.id),
      })
    );
  });

  app.get("/entries/:id/edit", (req, res) => {
    const user = req.user;
    const entry = Entry.getById(user.id, req.params.id);
    if (!entry) return sendHtml(res, notFoundView(user), 404);

    return sendHtml(
      res,
      entryFormView({
        user,
        entry,
        competence: entry.competence_month,
        categories: Category.list(user.id),
        accounts: Account.active(user.id),
        action: `/entries/${entry.id}`,
      })
    );
  });

  app.post("/entries", requireCsrf, (req, res) => {
    const entry = Entry.create(req.user, req.body);
    return redirect(res, `/entries?competence=${entry.competence_month}`);
  });

  app.post("/entries/:id", requireCsrf, (req, res) => {
    const entry = Entry.update(req.user, req.params.id, req.body);
    const competence = entry ? entry.competence_month : normalizeCompetence(req.body.competence_month, req.user.timezone);
    return redirect(res, `/entries?competence=${competence}`);
  });

  app.post("/entries/:id/cancel", requireCsrf, (req, res) => {
    const entry = Entry.getById(req.user.id, req.params.id);
    Entry.cancel(req.user, req.params.id);
    const competence = entry ? entry.competence_month : normalizeCompetence("", req.user.timezone);
    return redirect(res, `/entries?competence=${competence}`);
  });

  app.post("/entries/:id/duplicate", requireCsrf, (req, res) => {
    const entry = Entry.duplicate(req.user, req.params.id);
    const competence = entry ? entry.competence_month : normalizeCompetence("", req.user.timezone);
    return redirect(res, `/entries?competence=${competence}`);
  });

  app.post("/entries/:id/settlements", requireCsrf, (req, res) => {
    const entry = Entry.settle(req.user, req.params.id, req.body);
    return redirect(res, entry ? `/entries/${entry.id}` : "/entries");
  });

  app.get("/accounts", (req, res) => {
    return sendHtml(res, accountsView({ user: req.user, accounts: Account.list(req.user.id) }));
  });

  app.post("/accounts", requireCsrf, (req, res) => {
    Account.create(req.user.id, req.body);
    return redirect(res, "/accounts");
  });

  app.get("/categories", (req, res) => {
    return sendHtml(res, categoriesView({ user: req.user, categories: Category.list(req.user.id) }));
  });

  app.post("/categories", requireCsrf, (req, res) => {
    Category.create(req.user.id, req.body);
    return redirect(res, "/categories");
  });

  app.get("/settings", (req, res) => {
    return sendHtml(res, settingsView({ user: req.user, saved: queryValue(req, "saved") === "1" }));
  });

  app.post("/settings", requireCsrf, (req, res) => {
    User.updateFontScale(req.user.id, req.body.font_scale);
    return redirect(res, "/settings?saved=1");
  });

  app.use((req, res) => {
    if (req.method === "GET") {
      return sendHtml(res, notFoundView(req.user), 404);
    }

    return sendJson(res, { error: "Método não permitido" }, 405);
  });

  app.use((err, req, res, next) => {
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
  return redirect(res, "/login");
}

function requireCsrf(req, res, next) {
  if (Auth.verifyCsrf(req, req.body)) return next();
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
  };
}

function handleLogin(res, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const user = User.findByEmail(email);

  if (!user || !Auth.verifyPassword(password, user.password_hash)) {
    return sendHtml(res, loginView({ email, error: "E-mail ou senha inválidos." }), 401);
  }

  const session = Auth.createSession(user.id);
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

  res.set("Set-Cookie", session.cookie);
  return redirect(res, nextPath);
}

function queryValue(req, name) {
  const value = req.query[name];
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
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

module.exports = {
  createServer,
};
