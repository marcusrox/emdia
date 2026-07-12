const { csrfInput, escapeHtml } = require("../services/viewHelpers");
const { layout } = require("./layout");

function profileView({ user, profile = user, saved = false, errors = [] }) {
  return layout({
    title: "Perfil",
    user,
    active: "",
    body: `
      <section class="page-heading">
        <span class="eyebrow">Conta do usuario</span>
        <h1>Perfil</h1>
        <p>Dados de acesso e identificacao usados na sua conta EmDia.</p>
      </section>
      ${saved ? `<p class="alert-success">Perfil atualizado com sucesso.</p>` : ""}
      ${errors.map((error) => `<p class="alert-error">${escapeHtml(error)}</p>`).join("")}
      <form method="post" action="/profile" class="panel form-grid form-compact profile-form">
        ${csrfInput(user)}
        <label class="profile-field-half">Nome
          <input name="name" value="${escapeHtml(profile.name || "")}" required>
        </label>
        <label class="profile-field-half">E-mail
          <input type="email" name="email" value="${escapeHtml(profile.email || "")}" required>
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
          <a class="ghost-button" href="/dashboard">Voltar</a>
          <button type="submit">Salvar</button>
        </div>
      </form>
    `,
  });
}

module.exports = {
  profileView,
};
