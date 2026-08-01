const User = require("../models/User");
const Auth = require("../services/authService");
const { logInfo, logWarn } = require("../services/operationalLogger");
const { redirect, requestDetails, sendHtml } = require("../services/http");
const { loginView, signupView } = require("../services/viewEngine");

function registerPublicAuthRoutes(app, { loginRateLimiter, signupRateLimiter }) {
  app.get("/login", (req, res) => {
    return req.user ? redirect(res, "/dashboard") : sendHtml(res, loginView({ email: "" }));
  });

  app.get("/signup", (req, res) => {
    if (req.user) return redirect(res, "/dashboard");
    return renderSignup(res);
  });

  app.post("/signup", (req, res) => {
    if (req.user) return redirect(res, "/dashboard");

    const values = publicSignupValues(req.body);
    const limit = signupRateLimiter.consume(req, values.email);
    if (limit.blocked) return blockedSignup(req, res, values, limit);

    if (!Auth.verifyPublicCsrf(req, req.body)) {
      logWarn("auth.signup.csrf_failed", "Cadastro bloqueado por token CSRF inválido.", {
        details: {
          emailFingerprint: limit.emailFingerprint,
          ...requestDetails(req),
        },
      });
      return renderSignup(res, {
        values,
        error: "Sua página de cadastro expirou. Atualize os dados e tente novamente.",
        statusCode: 403,
      });
    }

    const result = User.registerPublic(req.body);
    if (!result.ok) {
      const duplicateEmail = Boolean(result.errors.email?.includes("já está cadastrado"));
      logWarn(
        duplicateEmail ? "auth.signup.email_conflict" : "auth.signup.validation_failed",
        duplicateEmail ? "Cadastro recusado por conflito de e-mail." : "Cadastro recusado por validação.",
        {
          details: {
            emailFingerprint: limit.emailFingerprint,
            fields: Object.keys(result.errors),
            ...requestDetails(req),
          },
        },
      );
      return renderSignup(res, {
        values: result.values,
        errors: result.errors,
        statusCode: duplicateEmail ? 409 : 422,
      });
    }

    const session = Auth.createSession(result.user.id);
    logInfo("auth.signup.success", "Cadastro público realizado com sucesso.", {
      user: result.user,
      details: requestDetails(req),
    });
    res.append("Set-Cookie", Auth.clearPublicCsrfCookie());
    res.append("Set-Cookie", session.cookie);
    return redirect(res, "/dashboard");
  });

  app.post("/login", (req, res) => {
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");
    const currentLimit = loginRateLimiter.inspect(req, email);
    if (currentLimit.blocked) return blockedLogin(req, res, email, currentLimit);

    const user = User.findByEmail(email);

    if (!user || !Auth.verifyPassword(password, user.password_hash)) {
      const updatedLimit = loginRateLimiter.recordFailure(req, email);
      if (updatedLimit.blocked) return blockedLogin(req, res, email, updatedLimit);

      logWarn("auth.login.failed", "Falha de login.", {
        details: {
          emailProvided: Boolean(email),
          ...requestDetails(req),
        },
      });
      return sendHtml(res, loginView({ email, error: "E-mail ou senha inválidos." }), 401);
    }

    loginRateLimiter.reset(req, email);
    const session = Auth.createSession(user.id);
    logInfo("auth.login.success", "Login realizado com sucesso.", {
      user,
      details: requestDetails(req),
    });
    res.set("Set-Cookie", session.cookie);
    return redirect(res, "/dashboard");
  });
}

function renderSignup(res, { values = {}, errors = {}, error = "", statusCode = 200 } = {}) {
  const csrf = Auth.createPublicCsrf();
  res.set("Set-Cookie", csrf.cookie);
  return sendHtml(res, signupView({ values, errors, error, csrfToken: csrf.token }), statusCode);
}

function blockedSignup(req, res, values, limit) {
  logWarn("auth.signup.blocked", "Cadastro bloqueado temporariamente por excesso de tentativas.", {
    details: {
      emailFingerprint: limit.emailFingerprint,
      retryAfterSeconds: limit.retryAfterSeconds,
      ...requestDetails(req),
    },
  });
  res.set("Retry-After", String(limit.retryAfterSeconds));
  return renderSignup(res, {
    values,
    error: "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.",
    statusCode: 429,
  });
}

function publicSignupValues(body = {}) {
  return {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    timezone: String(body.timezone || "").trim(),
  };
}

function blockedLogin(req, res, email, limit) {
  logWarn("auth.login.blocked", "Login bloqueado temporariamente por excesso de tentativas.", {
    details: {
      emailFingerprint: limit.emailFingerprint,
      retryAfterSeconds: limit.retryAfterSeconds,
      ...requestDetails(req),
    },
  });
  res.set("Retry-After", String(limit.retryAfterSeconds));
  return sendHtml(
    res,
    loginView({ email, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }),
    429,
  );
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
