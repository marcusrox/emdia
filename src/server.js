const http = require("node:http");
const path = require("node:path");
const Account = require("./models/FinancialAccount");
const Category = require("./models/Category");
const Entry = require("./models/FinancialEntry");
const Settlement = require("./models/Settlement");
const User = require("./models/User");
const { dueDateFromCompetence, normalizeCompetence } = require("./services/dateService");
const Auth = require("./services/authService");
const { getPathParts, parseBody, redirect, sendHtml, sendJson } = require("./services/http");
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
  staticFile,
} = require("./services/viewEngine");

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");

      if (url.pathname.startsWith("/public/")) {
        return servePublic(url.pathname, res);
      }

      if (url.pathname === "/health" || url.pathname === "/ready") {
        return sendJson(res, { ok: true, service: "emdia" });
      }

      User.ensureDefaultUser();
      const session = Auth.getSession(req);
      const user = session ? sessionUser(session) : null;
      if (user) {
        user.csrfToken = Auth.csrfToken(req);
      } else if (canUseDevelopmentLogin(req)) {
        return startDevelopmentSession(req, res, url);
      }

      if (url.pathname === "/login") {
        if (req.method === "GET") {
          return user ? redirect(res, "/dashboard") : sendHtml(res, loginView({ email: "" }));
        }

        if (req.method === "POST") {
          const body = await parseBody(req);
          return handleLogin(res, body);
        }
      }

      if (url.pathname === "/logout" && req.method === "POST") {
        const body = await parseBody(req);
        if (!user || !Auth.verifyCsrf(req, body)) {
          return sendHtml(res, "<h1>Requisição inválida</h1><p>Atualize a página e tente novamente.</p>", 403);
        }
        Auth.invalidateSession(req);
        return redirect(res, "/login", { "set-cookie": Auth.clearSessionCookie() });
      }

      if (!user) {
        return redirect(res, "/login");
      }

      if (req.method === "GET") {
        return handleGet(req, res, url, user);
      }

      if (req.method === "POST") {
        const body = await parseBody(req);
        if (!Auth.verifyCsrf(req, body)) {
          return sendHtml(res, "<h1>Requisição inválida</h1><p>Atualize a página e tente novamente.</p>", 403);
        }
        return handlePost(req, res, url, user, body);
      }

      sendJson(res, { error: "Método não permitido" }, 405);
    } catch (error) {
      console.error(error);
      sendHtml(
        res,
        `<h1>Erro no EmDia</h1><p>${String(error.message || error)}</p><p><a href="/dashboard">Voltar ao dashboard</a></p>`,
        500
      );
    }
  });
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
  return redirect(res, "/dashboard", { "set-cookie": session.cookie });
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

function startDevelopmentSession(req, res, url) {
  const devUser = User.ensureDefaultUser();
  const session = Auth.createSession(devUser.id);
  const nextPath = url.pathname === "/login" ? "/dashboard" : req.url;

  return redirect(res, nextPath, { "set-cookie": session.cookie });
}

function handleGet(req, res, url, user) {
  const parts = getPathParts(url.pathname);

  if (url.pathname === "/") {
    return redirect(res, "/dashboard");
  }

  if (url.pathname === "/dashboard") {
    const competence = normalizeCompetence(url.searchParams.get("competence"), user.timezone);
    return sendHtml(res, dashboardView({ user, competence, dashboard: Entry.dashboard(user, competence) }));
  }

  if (url.pathname === "/entries") {
    const competence = normalizeCompetence(url.searchParams.get("competence"), user.timezone);
    const filters = {
      competence,
      q: url.searchParams.get("q") || "",
      entry_type: url.searchParams.get("entry_type") || "",
      status: url.searchParams.get("status") || "",
      category_id: url.searchParams.get("category_id") || "",
      account_id: url.searchParams.get("account_id") || "",
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
  }

  if (url.pathname === "/entries/new") {
    const competence = normalizeCompetence(url.searchParams.get("competence"), user.timezone);
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
  }

  if (parts[0] === "entries" && parts[1] && !parts[2]) {
    const entry = Entry.getById(user.id, parts[1]);
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
  }

  if (parts[0] === "entries" && parts[1] && parts[2] === "edit") {
    const entry = Entry.getById(user.id, parts[1]);
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
  }

  if (url.pathname === "/accounts") {
    return sendHtml(res, accountsView({ user, accounts: Account.list(user.id) }));
  }

  if (url.pathname === "/categories") {
    return sendHtml(res, categoriesView({ user, categories: Category.list(user.id) }));
  }

  if (url.pathname === "/settings") {
    return sendHtml(res, settingsView({ user, saved: url.searchParams.get("saved") === "1" }));
  }

  return sendHtml(res, notFoundView(user), 404);
}

function handlePost(req, res, url, user, body) {
  const parts = getPathParts(url.pathname);

  if (url.pathname === "/entries") {
    const entry = Entry.create(user, body);
    return redirect(res, `/entries?competence=${entry.competence_month}`);
  }

  if (parts[0] === "entries" && parts[1] && !parts[2]) {
    const entry = Entry.update(user, parts[1], body);
    return redirect(res, `/entries?competence=${entry ? entry.competence_month : normalizeCompetence(body.competence_month, user.timezone)}`);
  }

  if (parts[0] === "entries" && parts[1] && parts[2] === "cancel") {
    const entry = Entry.getById(user.id, parts[1]);
    Entry.cancel(user, parts[1]);
    return redirect(res, `/entries?competence=${entry ? entry.competence_month : normalizeCompetence("", user.timezone)}`);
  }

  if (parts[0] === "entries" && parts[1] && parts[2] === "duplicate") {
    const entry = Entry.duplicate(user, parts[1]);
    return redirect(res, `/entries?competence=${entry ? entry.competence_month : normalizeCompetence("", user.timezone)}`);
  }

  if (parts[0] === "entries" && parts[1] && parts[2] === "settlements") {
    const entry = Entry.settle(user, parts[1], body);
    return redirect(res, entry ? `/entries/${entry.id}` : "/entries");
  }

  if (url.pathname === "/accounts") {
    Account.create(user.id, body);
    return redirect(res, "/accounts");
  }

  if (url.pathname === "/categories") {
    Category.create(user.id, body);
    return redirect(res, "/categories");
  }

  if (url.pathname === "/settings") {
    User.updateFontScale(user.id, body.font_scale);
    return redirect(res, "/settings?saved=1");
  }

  return sendHtml(res, notFoundView(user), 404);
}

function servePublic(pathname, res) {
  const normalized = path.normalize(pathname.replace(/^\/+/, ""));
  if (!normalized.startsWith("public")) {
    return sendJson(res, { error: "Arquivo inválido" }, 400);
  }

  const body = staticFile(normalized);
  const contentType = publicContentType(normalized);
  res.writeHead(200, { "content-type": contentType });
  res.end(body);
}

function publicContentType(filePath) {
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

module.exports = {
  createServer,
};
