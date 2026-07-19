const { addMonths, currentCompetence, monthLabel } = require("../services/dateService");
const {
  buttonContent,
  buttonLink,
  csrfInput,
  escapeHtml,
  gravatarAvatar,
  lucideIcon,
  normalizeFontScale,
  normalizeListDensity,
  pageHeading,
  renderNotifications,
} = require("../services/viewHelpers");
const { RELEASE_LABEL } = require("../config/release");
const { readPublishedCommit } = require("../services/deploymentInfoService");

function layout({ title, user, active, body, notifications = [] }) {
  const nav = [
    ["/dashboard", "Dashboard"],
    ["/calendar", "Agenda"],
    ["/entries", "Lançamentos"],
    ["/recurrences", "Recorrências"],
    ["/accounts", "Contas"],
    ["/categories", "Categorias"],
  ];

  const fontScale = normalizeFontScale(user?.font_scale);
  const listDensity = normalizeListDensity(user?.list_density);
  const systemDateTime = formatSystemDateTime(user?.timezone);
  const userMenu = userMenuItems(user, active);
  const publishedCommit = readPublishedCommit();

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
          ${gravatarAvatar({ email: user.email, name: user.name, size: 40, className: "topbar-avatar", loading: "eager" })}
        </summary>
        <div class="user-menu-panel">
          ${userMenu}
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
        ${gravatarAvatar({ email: user.email, name: user.name, size: 32, className: "topbar-avatar", loading: "eager" })}
        <span>${escapeHtml(user.name)}</span>
      </summary>
      <div class="user-menu-panel">
        ${userMenu}
      </div>
    </details>
  </header>
  ${renderNotifications(notifications)}
  <main class="page">${body}</main>
  <footer class="app-footer">
    <small class="footer-system-time">Sistema: ${escapeHtml(systemDateTime)}</small>
    <p class="footer-message"><strong>EmDia</strong> Desenvolvido com <span class="footer-heart" aria-label="coração vermelho"></span> para você ficar sempre dentro do planejamento</p>
    <div class="footer-version">
      <div><small class="footer-release">${escapeHtml(RELEASE_LABEL)}</small></div>
      ${publishedCommit ? `<div><small class="footer-commit">${escapeHtml(publishedCommit)}</small></div>` : ""}
    </div>
  </footer>
  <script src="/public/js/app.js"></script>
</body>
</html>`;
}

function userMenuItems(user, active) {
  const adminMenu = user?.is_admin ? adminMenuItems(active) : "";

  return `<a href="/profile">${buttonContent("Perfil", "user-round")}</a>
    <a href="/settings">${buttonContent("Configurações", "settings")}</a>
    <a href="/audit">${buttonContent("Auditoria", "clipboard-list")}</a>
    ${adminMenu}
    <form method="post" action="/logout">
      ${csrfInput(user)}
      <button type="submit">${buttonContent("Sair", "log-out")}</button>
    </form>`;
}

function adminMenuItems(active) {
  return `<div class="admin-menu-group" aria-label="Administração">
    <span class="admin-menu-label">${lucideIcon("shield-check")} Administração</span>
    <a class="admin-menu-link ${active === "/admin/users" ? "active" : ""}" href="/admin/users">${buttonContent("Usuários", "users")}</a>
    <a class="admin-menu-link ${active === "/admin/notifications" ? "active" : ""}" href="/admin/notifications">${buttonContent("Fila de notificações", "bell")}</a>
    <a class="admin-menu-link ${active === "/operational-logs" ? "active" : ""}" href="/operational-logs">${buttonContent("Logs operacionais", "file-text")}</a>
    <a class="admin-menu-link ${active === "/runtime-environment" ? "active" : ""}" href="/runtime-environment">${buttonContent("Ambiente de execução", "server")}</a>
  </div>`;
}

function monthSwitcher({ pathname, competence, current = currentCompetence(), title, eyebrow, icon = "", additionalActions = "" }) {
  const actions = `<div class="month-actions">
      <a class="icon-button" title="Mês anterior" href="${pathname}?competence=${addMonths(competence, -1)}">‹</a>
      <form action="${pathname}" method="get" class="month-form" data-auto-submit-on-change>
        <input type="month" name="competence" value="${escapeHtml(competence)}" aria-label="Competência">
      </form>
      <a class="icon-button" title="Próximo mês" href="${pathname}?competence=${addMonths(competence, 1)}">›</a>
      ${buttonLink({ href: `${pathname}?competence=${current}`, label: "Mês atual", icon: "calendar-days" })}
    </div>${String(additionalActions || "").trim()}`;

  return pageHeading({
    eyebrow,
    title,
    icon,
    description: `Competência: ${monthLabel(competence)}`,
    actions,
    className: "page-heading-monthly",
  });
}

function card(label, value, tone = "", icon = "circle-dollar-sign") {
  return `<article class="metric ${tone}">
    <div class="metric-heading">
      <span>${escapeHtml(label)}</span>
      <span class="metric-icon">${lucideIcon(icon)}</span>
    </div>
    <strong>${escapeHtml(value)}</strong>
  </article>`;
}

function formatSystemDateTime(timezone = "America/Sao_Paulo") {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: timezone || "America/Sao_Paulo",
    }).format(new Date());
  } catch (error) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
  }
}

module.exports = {
  card,
  layout,
  monthSwitcher,
};
