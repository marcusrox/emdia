const User = require("../models/User");
const Auth = require("../services/authService");
const { logInfo, logWarn } = require("../services/operationalLogger");
const { redirect, requestDetails, sendHtml } = require("../services/http");

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

function requireAdmin(req, res, next) {
  if (req.user?.is_admin) return next();
  logWarn("auth.admin_access.denied", "Acesso administrativo negado.", {
    user: req.user,
    details: requestDetails(req),
  });
  return sendHtml(res, "<h1>Acesso negado</h1><p>Esta página é exclusiva para administradores.</p>", 403);
}

function sessionUser(session) {
  return {
    id: session.user_id,
    name: session.name,
    email: session.email,
    phone_e164: session.phone_e164,
    timezone: session.timezone,
    locale: session.locale,
    is_active: session.is_active,
    is_admin: Boolean(session.is_admin),
    font_scale: User.normalizeFontScale(session.font_scale),
    list_density: User.normalizeListDensity(session.list_density),
  };
}

function canUseDevelopmentLogin(req) {
  return process.env.EMDIA_AUTO_LOGIN === "true" && req.method === "GET" && isLocalhostRequest(req);
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
    details: requestDetails(req, {
      mode: "development",
      nextPath,
    }),
  });
  res.set("Set-Cookie", session.cookie);
  return redirect(res, nextPath);
}

module.exports = {
  loadSession,
  requireAdmin,
  requireAuth,
  requireCsrf,
};
