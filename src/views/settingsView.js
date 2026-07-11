const { FONT_SCALE_OPTIONS, csrfInput, normalizeFontScale } = require("../services/viewHelpers");
const { layout } = require("./layout");

function settingsView({ user, saved = false }) {
  return layout({
    title: "Configurações",
    user,
    active: "",
    body: `
      <section class="page-heading">
        <span class="eyebrow">Preferências</span>
        <h1>Configurações</h1>
        <p>Ajustes individuais da sua interface no EmDia.</p>
      </section>
      ${saved ? `<p class="alert-success">Configuração salva com sucesso.</p>` : ""}
      <form method="post" action="/settings" class="panel form-stack form-compact settings-form">
        ${csrfInput(user)}
        <fieldset class="choice-group">
          <legend>Tamanho da fonte</legend>
          ${FONT_SCALE_OPTIONS.map(
            ([value, label, description]) => `
              <label class="choice-card">
                <input type="radio" name="font_scale" value="${value}"${normalizeFontScale(user.font_scale) === value ? " checked" : ""}>
                <span>
                  <strong>${label}</strong>
                  <small>${description}</small>
                </span>
              </label>`
          ).join("")}
        </fieldset>
        <div class="form-actions">
          <a class="ghost-button" href="/dashboard">Voltar</a>
          <button type="submit">Salvar configurações</button>
        </div>
      </form>
    `,
  });
}

module.exports = {
  settingsView,
};
