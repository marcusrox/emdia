const { escapeHtml, renderNotifications } = require("../services/viewHelpers");

function loginView({ email = "", error = "" } = {}) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login · EmDia</title>
  <link rel="icon" type="image/svg+xml" href="/public/favicon.svg">
  <link rel="stylesheet" href="/public/css/styles.css">
</head>
<body class="auth-page">
  ${renderNotifications(error ? [{ type: "error", message: error }] : [])}
  <main class="auth-shell">
    <section class="auth-panel">
      <div class="brand auth-brand">
        <span class="auth-brand-mark" aria-hidden="true">
          <span>Em</span>
        </span>
        <span class="auth-brand-copy">
          <strong>EmDia</strong>
          <small>Suas contas no tempo certo.</small>
        </span>
      </div>
      <div class="auth-copy">
        <span class="eyebrow">Acesso seguro</span>
        <h1>Entrar no EmDia</h1>
        <p>Confira vencimentos, receitas e baixas da competencia atual em poucos cliques.</p>
      </div>
      <form class="form-stack" method="post" action="/login">
        <label>E-mail
          <input type="email" name="email" value="${escapeHtml(email)}" autocomplete="email" required autofocus>
        </label>
        <label>Senha
          <input type="password" name="password" autocomplete="current-password" required>
        </label>
        <button type="submit">Entrar</button>
      </form>
    </section>
  </main>
</body>
</html>`;
}

module.exports = {
  loginView,
};
