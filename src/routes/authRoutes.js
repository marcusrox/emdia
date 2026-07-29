const User = require("../models/User");
const Auth = require("../services/authService");
const { logInfo, logWarn } = require("../services/operationalLogger");
const { redirect, requestDetails, sendHtml } = require("../services/http");
const { loginView } = require("../services/viewEngine");

function registerPublicAuthRoutes(app) {
  app.get("/login", (req, res) => {
    return req.user ? redirect(res, "/dashboard") : sendHtml(res, loginView({ email: "" }));
  });

  app.post("/login", (req, res) => {
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");
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
    logInfo("auth.login.success", "Login realizado com sucesso.", {
      user,
      details: requestDetails(req),
    });
    res.set("Set-Cookie", session.cookie);
    return redirect(res, "/dashboard");
  });
}

function registerProtectedAuthRoutes(app, { requireCsrf }) {
  app.post("/logout", requireCsrf, (req, res) => {
    logInfo("auth.logout", "Logout realizado.", {
      user: req.user,
      details: requestDetails(req),
    });
    Auth.invalidateSession(req);
    res.set("Set-Cookie", Auth.clearSessionCookie());
    return redirect(res, "/login");
  });
}

module.exports = {
  registerProtectedAuthRoutes,
  registerPublicAuthRoutes,
};
