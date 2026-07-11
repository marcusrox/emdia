const http = require("node:http");
const path = require("node:path");
const Account = require("./models/FinancialAccount");
const Category = require("./models/Category");
const Entry = require("./models/FinancialEntry");
const Settlement = require("./models/Settlement");
const User = require("./models/User");
const { dueDateFromCompetence, normalizeCompetence } = require("./services/dateService");
const { getPathParts, parseBody, redirect, sendHtml, sendJson } = require("./services/http");
const {
  accountsView,
  categoriesView,
  dashboardView,
  entriesListView,
  entryDetailView,
  entryFormView,
  notFoundView,
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

      const user = User.ensureDefaultUser();

      if (req.method === "GET") {
        return handleGet(req, res, url, user);
      }

      if (req.method === "POST") {
        const body = await parseBody(req);
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

  return sendHtml(res, notFoundView(user), 404);
}

function servePublic(pathname, res) {
  const normalized = path.normalize(pathname.replace(/^\/+/, ""));
  if (!normalized.startsWith("public")) {
    return sendJson(res, { error: "Arquivo inválido" }, 400);
  }

  const body = staticFile(normalized);
  const contentType = normalized.endsWith(".css") ? "text/css; charset=utf-8" : "application/octet-stream";
  res.writeHead(200, { "content-type": contentType });
  res.end(body);
}

module.exports = {
  createServer,
};
