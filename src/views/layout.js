const { addMonths, currentCompetence, monthLabel } = require("../services/dateService");
const { csrfInput, escapeHtml, normalizeFontScale } = require("../services/viewHelpers");
const { RELEASE_LABEL } = require("../config/release");

function layout({ title, user, active, body }) {
  const nav = [
    ["/dashboard", "Dashboard"],
    ["/entries", "Lançamentos"],
    ["/entries/new", "Novo lançamento"],
    ["/accounts", "Contas"],
    ["/categories", "Categorias"],
  ];

  const fontScale = normalizeFontScale(user?.font_scale);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · EmDia</title>
  <link rel="icon" type="image/svg+xml" href="/public/favicon.svg">
  <link rel="stylesheet" href="/public/css/styles.css">
</head>
<body class="font-scale-${fontScale}">
  <header class="topbar">
    <a class="brand auth-brand app-brand" href="/dashboard">
      <span class="auth-brand-mark" aria-hidden="true">
        <span>Em</span>
      </span>
      <span class="auth-brand-copy">
        <strong>EmDia</strong>
        <small>Suas contas no tempo certo.</small>
      </span>
    </a>
    <nav class="main-nav desktop-nav">
      ${nav.map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`).join("")}
    </nav>
    <details class="mobile-nav-menu">
      <summary aria-label="Abrir menu de navegação">
        <span aria-hidden="true"></span>
        <strong>Menu</strong>
      </summary>
      <nav class="main-nav mobile-nav">
        ${nav.map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`).join("")}
      </nav>
    </details>
    <details class="user-menu">
      <summary class="user-chip">${escapeHtml(user.name)}</summary>
      <div class="user-menu-panel">
        <a href="/settings">Configurações</a>
        <form method="post" action="/logout">
          ${csrfInput(user)}
          <button type="submit">Sair</button>
        </form>
      </div>
    </details>
  </header>
  <main class="page">${body}</main>
  <footer class="app-footer">
    <span>EmDia</span>
    <p>Desenvolvido com <span class="footer-heart" aria-label="coração vermelho"></span> para você ficar sempre dentro do planejamento</p>
    <small>${escapeHtml(RELEASE_LABEL)}</small>
  </footer>
</body>
</html>`;
}

function monthSwitcher(pathname, competence, current = currentCompetence()) {
  return `<section class="monthbar">
    <div>
      <span class="eyebrow">Competência selecionada</span>
      <h1>${escapeHtml(monthLabel(competence))}</h1>
    </div>
    <div class="month-actions">
      <a class="icon-button" title="Mês anterior" href="${pathname}?competence=${addMonths(competence, -1)}">‹</a>
      <form action="${pathname}" method="get" class="month-form">
        <input type="month" name="competence" value="${escapeHtml(competence)}" aria-label="Competência">
        <button type="submit">Aplicar</button>
      </form>
      <a class="icon-button" title="Próximo mês" href="${pathname}?competence=${addMonths(competence, 1)}">›</a>
      <a class="ghost-button" href="${pathname}?competence=${current}">Mês atual</a>
    </div>
  </section>`;
}

function card(label, value, tone = "") {
  return `<article class="metric ${tone}">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </article>`;
}

module.exports = {
  card,
  layout,
  monthSwitcher,
};
