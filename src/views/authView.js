const {
  buttonContent,
  escapeHtml,
  fieldError,
  fieldErrorAttributes,
  lucideIcon,
  renderNotifications,
} = require("../services/viewHelpers");
const { versionedAssetPath } = require("../config/release");

function loginView({ email = "", error = "" } = {}) {
  return authPage({
    title: "Login",
    notifications: error ? [{ type: "error", message: error }] : [],
    form: `
      <div class="auth-copy">
        <span class="eyebrow">Acesso seguro</span>
        <h1>Entrar no EmDia</h1>
        <p>Acesse sua organização financeira e continue de onde parou.</p>
      </div>
      <form class="form-stack auth-form" method="post" action="/login">
        <label>E-mail
          <input type="email" name="email" value="${escapeHtml(email)}" autocomplete="email" maxlength="254" required autofocus>
        </label>
        <label>Senha
          <input type="password" name="password" autocomplete="current-password" required>
        </label>
        <button type="submit">${buttonContent("Entrar", "log-in")}</button>
      </form>
      <div class="auth-alternate">
        <span>Ainda não usa o EmDia?</span>
        <a class="ghost-button auth-alternate-link" href="/signup">${buttonContent("Criar minha conta", "user-plus")}</a>
      </div>`,
  });
}

function signupView({ values = {}, errors = {}, error = "", csrfToken = "" } = {}) {
  return authPage({
    title: "Criar conta",
    notifications: error ? [{ type: "error", message: error }] : [],
    form: `
      <div class="auth-copy">
        <span class="eyebrow">Comece agora</span>
        <h1>Criar minha conta</h1>
        <p>Preencha seus dados para organizar o mês com contas e categorias prontas para usar.</p>
      </div>
      <form class="form-stack auth-form" method="post" action="/signup" data-validate-form data-disable-on-submit>
        <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}">
        <input type="hidden" name="timezone" value="${escapeHtml(values.timezone || "America/Sao_Paulo")}" data-timezone-field>
        <label>Nome
          <input type="text" name="name" value="${escapeHtml(values.name || "")}" autocomplete="name" maxlength="120" required autofocus${fieldErrorAttributes(errors, "name")}>
          ${fieldError(errors, "name")}
        </label>
        <label>E-mail
          <input type="email" name="email" value="${escapeHtml(values.email || "")}" autocomplete="email" maxlength="254" required${fieldErrorAttributes(errors, "email")}>
          ${fieldError(errors, "email")}
        </label>
        <label>Senha
          <input type="password" name="password" autocomplete="new-password" minlength="12" required${fieldErrorAttributes(errors, "password")}>
          <small class="auth-field-hint">Use pelo menos 12 caracteres.</small>
          ${fieldError(errors, "password")}
        </label>
        <label>Confirmar senha
          <input type="password" name="confirm_password" autocomplete="new-password" minlength="12" required${fieldErrorAttributes(errors, "confirm_password")}>
          ${fieldError(errors, "confirm_password")}
        </label>
        <button type="submit">${buttonContent("Criar minha conta", "user-plus")}</button>
      </form>
      <div class="auth-alternate">
        <span>Já tem uma conta?</span>
        <a class="ghost-button auth-alternate-link" href="/login">${buttonContent("Entrar", "log-in")}</a>
      </div>`,
  });
}

function authPage({ title, notifications = [], form }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · EmDia</title>
  <link rel="icon" type="image/svg+xml" href="${versionedAssetPath("/public/favicon.svg")}">
  <link rel="stylesheet" href="${versionedAssetPath("/public/css/styles.css")}">
  <script src="${versionedAssetPath("/public/js/app.js")}" defer></script>
</head>
<body class="auth-page">
  ${renderNotifications(notifications)}
  <main class="auth-shell">
    <section class="auth-card">
      <div class="auth-presentation">
        ${authBrand()}
        <div class="auth-presentation-copy">
          <span class="eyebrow">Seu mês em perspectiva</span>
          <h2>Tenha clareza sobre o seu mês financeiro.</h2>
          <p>Organize receitas e despesas, acompanhe vencimentos e registre pagamentos em um só lugar. Cuide do que vence hoje sem perder de vista o restante do mês.</p>
        </div>
        <ul class="auth-benefits">
          ${authBenefit("circle-check", "Veja o que vence, o que está atrasado e o que já foi pago.")}
          ${authBenefit("calendar-range", "Acompanhe receitas e despesas pela competência do mês.")}
          ${authBenefit("list-checks", "Mantenha contas, categorias e recorrências organizadas.")}
        </ul>
      </div>
      <div class="auth-panel">
        ${form}
      </div>
    </section>
  </main>
</body>
</html>`;
}

function authBrand() {
  return `<div class="brand auth-brand">
    <span class="auth-brand-mark" aria-hidden="true"><span>Em</span></span>
    <span class="auth-brand-copy">
      <strong>EmDia</strong>
      <small>Suas contas no tempo certo.</small>
    </span>
  </div>`;
}

function authBenefit(icon, text) {
  return `<li><span class="auth-benefit-icon" aria-hidden="true">${lucideIcon(icon)}</span><span>${escapeHtml(text)}</span></li>`;
}

module.exports = {
  loginView,
  signupView,
};
