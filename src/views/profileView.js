const { buttonContent, buttonLink, csrfInput, escapeHtml, fieldLabel, lucideIcon, pageHeading } = require("../services/viewHelpers");
const { layout } = require("./layout");

function profileView({ user, profile = user, saved = false, errors = [] }) {
  return layout({
    title: "Perfil",
    user,
    active: "",
    notifications: [
      ...(saved ? [{ type: "success", message: "Perfil atualizado com sucesso." }] : []),
      ...errors.map((error) => ({ type: "error", message: error })),
    ],
    body: `
      ${pageHeading({
        eyebrow: "Conta do usuário",
        title: "Perfil",
        description: "Dados de acesso e identificação usados na sua conta EmDia.",
      })}
      <form method="post" action="/profile" class="panel profile-form">
        ${csrfInput(user)}
        <div class="profile-form-section">
          <div class="profile-section-heading">
            <span class="profile-section-icon">${lucideIcon("user-round")}</span>
            <div>
              <h2>Dados pessoais</h2>
              <p>Informações usadas para identificar sua conta.</p>
            </div>
          </div>
          <div class="profile-fields">
            <label>Nome completo
              <input name="name" value="${escapeHtml(profile.name || "")}" autocomplete="name" required>
            </label>
            <label>E-mail
              <input type="email" name="email" value="${escapeHtml(profile.email || "")}" autocomplete="email" required>
            </label>
            <label class="profile-field-wide">${fieldLabel("Telefone WhatsApp", "Use +5571999999999 ou (71) 99999-9999. O sistema salva no formato internacional E.164.")}
              <input name="phone_e164" value="${escapeHtml(profile.phone_e164 || "")}" placeholder="(71) 99999-9999" inputmode="tel" autocomplete="tel">
              <small>Usado somente para notificações que você habilitar.</small>
            </label>
          </div>
        </div>
        <div class="profile-form-section profile-security-section">
          <div class="profile-section-heading">
            <span class="profile-section-icon">${lucideIcon("lock-keyhole")}</span>
            <div>
              <h2>Segurança</h2>
              <p>Preencha estes campos apenas se quiser alterar sua senha.</p>
            </div>
          </div>
          <div class="profile-fields profile-password-fields">
            <label class="profile-field-wide">Senha atual
              <input type="password" name="current_password" autocomplete="current-password" placeholder="Digite sua senha atual">
            </label>
            <label>Nova senha
              <input type="password" name="new_password" autocomplete="new-password" placeholder="Mínimo de 6 caracteres">
            </label>
            <label>Confirmar nova senha
              <input type="password" name="confirm_password" autocomplete="new-password" placeholder="Repita a nova senha">
            </label>
          </div>
        </div>
        <div class="form-actions profile-form-actions">
          ${buttonLink({ href: "/dashboard", label: "Voltar", icon: "arrow-left" })}
          <button type="submit">${buttonContent("Salvar alterações", "save")}</button>
        </div>
      </form>
    `,
  });
}

module.exports = {
  profileView,
};
