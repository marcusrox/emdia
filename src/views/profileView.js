const { buttonContent, buttonLink, csrfInput, escapeHtml, fieldLabel } = require("../services/viewHelpers");
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
      <section class="page-heading">
        <span class="eyebrow">Conta do usuario</span>
        <h1>Perfil</h1>
        <p>Dados de acesso e identificacao usados na sua conta EmDia.</p>
      </section>
      <form method="post" action="/profile" class="panel form-grid form-compact profile-form">
        ${csrfInput(user)}
        <label class="profile-field-half">Nome
          <input name="name" value="${escapeHtml(profile.name || "")}" required>
        </label>
        <label class="profile-field-half">E-mail
          <input type="email" name="email" value="${escapeHtml(profile.email || "")}" required>
        </label>
        <label class="profile-field-half">${fieldLabel("Telefone WhatsApp", "Use +5571999999999 ou (71) 99999-9999. O sistema salva no formato internacional E.164.")}
          <input name="phone_e164" value="${escapeHtml(profile.phone_e164 || "")}" placeholder="+5571999999999" inputmode="tel">
        </label>
        <label class="profile-field-third">Senha atual
          <input type="password" name="current_password" autocomplete="current-password">
        </label>
        <label class="profile-field-third">Nova senha
          <input type="password" name="new_password" autocomplete="new-password">
        </label>
        <label class="profile-field-third">Confirmar nova senha
          <input type="password" name="confirm_password" autocomplete="new-password">
        </label>
        <div class="form-actions wide">
          ${buttonLink({ href: "/dashboard", label: "Voltar", icon: "arrow-left" })}
          <button type="submit">${buttonContent("Salvar", "save")}</button>
        </div>
      </form>
    `,
  });
}

module.exports = {
  profileView,
};
