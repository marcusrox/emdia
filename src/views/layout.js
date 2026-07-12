const { addMonths, currentCompetence, monthLabel } = require("../services/dateService");
const { csrfInput, escapeHtml, normalizeFontScale, normalizeListDensity, renderNotifications } = require("../services/viewHelpers");
const { RELEASE_LABEL } = require("../config/release");

function layout({ title, user, active, body, notifications = [] }) {
  const nav = [
    ["/dashboard", "Dashboard"],
    ["/entries", "Lançamentos"],
    ["/entries/new", "Novo lançamento"],
    ["/accounts", "Contas"],
    ["/categories", "Categorias"],
  ];

  const fontScale = normalizeFontScale(user?.font_scale);
  const listDensity = normalizeListDensity(user?.list_density);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · EmDia</title>
  <link rel="icon" type="image/svg+xml" href="/public/favicon.svg">
  <link rel="stylesheet" href="/public/css/styles.css">
</head>
<body class="font-scale-${fontScale} list-density-${listDensity}">
  <header class="topbar">
    <div class="mobile-top-row">
      <details class="mobile-nav-menu" name="mobile-top-menu">
        <summary aria-label="Abrir menu de navegação">
          <span aria-hidden="true"></span>
        </summary>
        <nav class="main-nav mobile-nav">
          ${nav.map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`).join("")}
        </nav>
      </details>
      <a class="brand auth-brand app-brand" href="/dashboard">
        <span class="auth-brand-mark" aria-hidden="true">
          <span>Em</span>
        </span>
        <span class="auth-brand-copy">
          <strong>EmDia</strong>
          <small>Suas contas no tempo certo.</small>
        </span>
      </a>
      <details class="user-menu mobile-user-menu" name="mobile-top-menu">
        <summary class="user-chip user-icon-button" aria-label="Abrir menu do usuário">
          <span aria-hidden="true"></span>
        </summary>
        <div class="user-menu-panel">
          <a href="/profile">Perfil</a>
          <a href="/settings">Configurações</a>
          <form method="post" action="/logout">
            ${csrfInput(user)}
            <button type="submit">Sair</button>
          </form>
        </div>
      </details>
    </div>
    <a class="brand auth-brand app-brand desktop-brand" href="/dashboard">
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
    <details class="user-menu desktop-user-menu">
      <summary class="user-chip desktop-user-chip">
        <span class="user-icon-small" aria-hidden="true"></span>
        <span>${escapeHtml(user.name)}</span>
      </summary>
      <div class="user-menu-panel">
        <a href="/profile">Perfil</a>
        <a href="/settings">Configurações</a>
        <form method="post" action="/logout">
          ${csrfInput(user)}
          <button type="submit">Sair</button>
        </form>
      </div>
    </details>
  </header>
  ${renderNotifications(notifications)}
  <main class="page">${body}</main>
  <footer class="app-footer">
    <span>EmDia</span>
    <p>Desenvolvido com <span class="footer-heart" aria-label="coração vermelho"></span> para você ficar sempre dentro do planejamento</p>
    <small>${escapeHtml(RELEASE_LABEL)}</small>
  </footer>
  <script src="/public/js/app.js"></script>
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
