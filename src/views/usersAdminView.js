const { layout } = require("./layout");
const {
  buttonContent,
  buttonLink,
  csrfInput,
  escapeHtml,
  fieldError,
  fieldErrorAttributes,
  fieldLabel,
  lucideIcon,
  option,
  pageHeading,
} = require("../services/viewHelpers");

function usersAdminListView({ user, users, filters, notifications = [] }) {
  return layout({
    title: "Usuários",
    user,
    active: "/admin/users",
    notifications,
    body: `
      ${pageHeading({
        eyebrow: "Administração · Controle de acesso",
        title: "Usuários",
        icon: "users",
        description: "Gerencie cadastros, perfis administrativos e acesso ao EmDia.",
        actions: `<span class="queue-admin-chip">${lucideIcon("shield-check")} Acesso administrativo</span>${buttonLink({ href: "/admin/users/new", label: "Novo usuário", icon: "user-plus", tone: "primary" })}`,
      })}
      <section class="toolbar users-admin-toolbar">
        <form method="get" action="/admin/users" class="filters users-admin-filters">
          <label>Busca<input name="q" value="${escapeHtml(filters.q)}" placeholder="Nome, e-mail ou telefone"></label>
          <label>Perfil<select name="role">${option("", "Todos", filters.role)}${option("user", "Usuário", filters.role)}${option("admin", "Administrador", filters.role)}</select></label>
          <label>Estado<select name="status">${option("", "Todos", filters.status)}${option("active", "Ativo", filters.status)}${option("blocked", "Bloqueado", filters.status)}</select></label>
          <div class="toolbar-actions">
            <button type="submit">${buttonContent("Filtrar", "filter")}</button>
            <a class="ghost-button" href="/admin/users">${buttonContent("Limpar", "eraser")}</a>
          </div>
        </form>
      </section>
      ${usersTable(user, users)}
    `,
  });
}

function userAdminFormView({ user, target = {}, action, isNew = false, errors = {}, notifications = [] }) {
  return layout({
    title: isNew ? "Novo usuário" : "Editar usuário",
    user,
    active: "/admin/users",
    notifications,
    body: `
      ${pageHeading({
        eyebrow: isNew ? "Administração · Novo cadastro" : "Administração · Editar cadastro",
        title: isNew ? "Novo usuário" : target.name,
        icon: "users",
        description: isNew ? "Crie uma credencial e defina o acesso inicial." : "Atualize dados e permissões sem alterar o histórico do usuário.",
      })}
      <form method="post" action="${escapeHtml(action)}" class="form-grid form-compact panel user-admin-form" data-validate-form>
        ${csrfInput(user)}
        <h2 class="wide">Dados cadastrais</h2>
        <label>${fieldLabel("Nome")}<input name="name" value="${escapeHtml(target.name)}" required${fieldErrorAttributes(errors, "name")}>${fieldError(errors, "name")}</label>
        <label>${fieldLabel("E-mail")}<input type="email" name="email" value="${escapeHtml(target.email)}" required autocomplete="off"${fieldErrorAttributes(errors, "email")}>${fieldError(errors, "email")}</label>
        <label>${fieldLabel("Telefone", "Informe no formato internacional ou com DDD brasileiro.")}<input name="phone_e164" value="${escapeHtml(target.phone_e164)}" placeholder="(71) 99999-9999"${fieldErrorAttributes(errors, "phone_e164")}>${fieldError(errors, "phone_e164")}</label>
        <label>${fieldLabel("Fuso horário")}<input name="timezone" value="${escapeHtml(target.timezone || "America/Sao_Paulo")}" required${fieldErrorAttributes(errors, "timezone")}>${fieldError(errors, "timezone")}</label>
        <label>${fieldLabel("Localidade")}<input name="locale" value="${escapeHtml(target.locale || "pt-BR")}" required${fieldErrorAttributes(errors, "locale")}>${fieldError(errors, "locale")}</label>
        <label>${fieldLabel("Perfil")}<select name="role"${fieldErrorAttributes(errors, "role")}>${option("user", "Usuário", target.is_admin ? "admin" : "user")}${option("admin", "Administrador", target.is_admin ? "admin" : "user")}</select>${fieldError(errors, "role")}</label>
        ${isNew ? `<label>${fieldLabel("Estado")}<select name="status">${option("active", "Ativo", target.is_active === 0 ? "blocked" : "active")}${option("blocked", "Bloqueado", target.is_active === 0 ? "blocked" : "active")}</select></label>` : `<div class="user-admin-current-state"><span>Estado atual</span>${statusBadge(target)}</div>`}
        ${isNew ? passwordFields(errors) : ""}
        <div class="form-actions wide">${buttonLink({ href: "/admin/users", label: "Voltar", icon: "arrow-left" })}<button type="submit">${buttonContent("Salvar", "save")}</button></div>
      </form>
      ${isNew ? "" : passwordResetPanel(user, target, errors)}
    `,
  });
}

function passwordFields(errors) {
  return `<h2 class="wide">Acesso inicial</h2>
    <label>${fieldLabel("Senha inicial")}<input type="password" name="new_password" required autocomplete="new-password"${fieldErrorAttributes(errors, "new_password")}>${fieldError(errors, "new_password")}</label>
    <label>${fieldLabel("Confirmar senha")}<input type="password" name="confirm_password" required autocomplete="new-password"${fieldErrorAttributes(errors, "confirm_password")}>${fieldError(errors, "confirm_password")}</label>`;
}

function passwordResetPanel(user, target, errors) {
  return `<section class="panel user-password-panel">
    <div><h2>Redefinir senha</h2><p>A troca encerra todas as sessões deste usuário.</p></div>
    <form method="post" action="/admin/users/${encodeURIComponent(target.id)}/reset-password" class="form-grid form-short" data-validate-form>
      ${csrfInput(user)}
      <label>Nova senha<input type="password" name="new_password" required autocomplete="new-password"${fieldErrorAttributes(errors, "new_password")}>${fieldError(errors, "new_password")}</label>
      <label>Confirmar nova senha<input type="password" name="confirm_password" required autocomplete="new-password"${fieldErrorAttributes(errors, "confirm_password")}>${fieldError(errors, "confirm_password")}</label>
      <div class="form-actions wide"><button type="submit">${buttonContent("Redefinir senha", "key-round")}</button></div>
    </form>
  </section>`;
}

function usersTable(user, users) {
  if (!users.length) return `<div class="empty-state">Nenhum usuário corresponde aos filtros.</div>`;
  return `<div class="table-wrap"><table class="users-admin-table"><thead><tr><th>Usuário</th><th>Contato</th><th>Perfil</th><th>Estado</th><th>Cadastro</th><th class="record-actions-cell">Ações</th></tr></thead>
    <tbody>${users.map((target) => `<tr>
      <td><strong>${escapeHtml(target.name)}</strong><small>${escapeHtml(target.id)}</small></td>
      <td>${escapeHtml(target.email)}${target.phone_e164 ? `<small>${escapeHtml(target.phone_e164)}</small>` : ""}</td>
      <td><span class="user-role user-role-${target.is_admin ? "admin" : "normal"}">${target.is_admin ? "Administrador" : "Usuário"}</span></td>
      <td>${statusBadge(target)}</td>
      <td>${escapeHtml(formatDate(target.created_at, user.timezone))}<small>Alterado ${escapeHtml(formatDate(target.updated_at, user.timezone))}</small></td>
      <td class="record-actions-cell"><div class="record-actions">
        <a class="record-action-button" href="/admin/users/${encodeURIComponent(target.id)}/edit" title="Editar usuário" aria-label="Editar usuário">${lucideIcon("pencil")}</a>
        ${target.is_active ? blockForm(user, target) : unblockForm(user, target)}
      </div></td>
    </tr>`).join("")}</tbody></table></div>`;
}

function blockForm(user, target) {
  if (user.id === target.id) return "";
  return `<form method="post" action="/admin/users/${encodeURIComponent(target.id)}/block" class="record-action-form" data-confirm="Bloquear ${escapeHtml(target.name)} e encerrar todas as sessões?">${csrfInput(user)}<button type="submit" class="record-action-button danger" title="Bloquear usuário" aria-label="Bloquear usuário">${lucideIcon("ban")}</button></form>`;
}

function unblockForm(user, target) {
  return `<form method="post" action="/admin/users/${encodeURIComponent(target.id)}/unblock" class="record-action-form">${csrfInput(user)}<button type="submit" class="record-action-button" title="Desbloquear usuário" aria-label="Desbloquear usuário">${lucideIcon("circle-check")}</button></form>`;
}

function statusBadge(target) {
  return `<span class="user-status user-status-${target.is_active ? "active" : "blocked"}">${target.is_active ? "Ativo" : "Bloqueado"}</span>`;
}

function formatDate(value, timezone) {
  try { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: timezone }).format(new Date(value)); }
  catch (error) { return value || "-"; }
}

module.exports = { userAdminFormView, usersAdminListView };
