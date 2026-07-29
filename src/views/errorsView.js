const { layout } = require("./layout");
const { buttonLink, escapeHtml, lucideIcon, pageHeading } = require("../services/viewHelpers");

function notFoundView(user) {
  return layout({
    title: "Não encontrado",
    user,
    active: "",
    body: pageHeading({
      eyebrow: "404",
      title: "Página não encontrada",
      icon: "circle-alert",
      description: "O caminho solicitado não existe no MVP atual.",
    }),
  });
}

function unexpectedErrorView({ user = null, errorId }) {
  const content = errorContent({
    errorId,
    returnTo: user ? "/dashboard" : "/login",
    returnLabel: user ? "Voltar ao dashboard" : "Voltar para o login",
  });

  if (user) {
    return layout({
      title: "Operação indisponível",
      user,
      active: "",
      body: content,
    });
  }

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Operação indisponível · EmDia</title>
  <link rel="icon" type="image/svg+xml" href="/public/favicon.svg">
  <link rel="stylesheet" href="/public/css/styles.css">
</head>
<body class="auth-page">
  <main class="auth-shell">
    <section class="auth-panel system-error-panel">
      <div class="brand auth-brand">
        <span class="auth-brand-mark" aria-hidden="true"><span>Em</span></span>
        <span class="auth-brand-copy">
          <strong>EmDia</strong>
          <small>Suas contas no tempo certo.</small>
        </span>
      </div>
      ${content}
    </section>
  </main>
</body>
</html>`;
}

function errorContent({ errorId, returnTo, returnLabel }) {
  return `<section class="system-error-card" aria-labelledby="system-error-title">
    <span class="system-error-icon" aria-hidden="true">${lucideIcon("circle-alert")}</span>
    <div class="system-error-copy">
      <span class="eyebrow">Erro inesperado</span>
      <h1 id="system-error-title">Não foi possível concluir a operação</h1>
      <p>O EmDia encontrou uma dificuldade temporária. Tente novamente e, se o problema continuar, informe o código abaixo ao suporte.</p>
    </div>
    <div class="system-error-reference" role="status">
      <span>Código de diagnóstico</span>
      <code>${escapeHtml(errorId)}</code>
    </div>
    <div class="system-error-actions">
      ${buttonLink({ href: returnTo, label: returnLabel, icon: "arrow-left", tone: "primary" })}
    </div>
  </section>`;
}

module.exports = {
  notFoundView,
  unexpectedErrorView,
};
