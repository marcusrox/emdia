const {
  FONT_SCALE_OPTIONS,
  LIST_DENSITY_OPTIONS,
  buttonContent,
  buttonLink,
  csrfInput,
  normalizeFontScale,
  normalizeListDensity,
} = require("../services/viewHelpers");
const { layout } = require("./layout");

function settingsView({ user, saved = false }) {
  return layout({
    title: "Configurações",
    user,
    active: "",
    notifications: saved ? [{ type: "success", message: "Configuração salva com sucesso." }] : [],
    body: `
      <section class="page-heading">
        <span class="eyebrow">Preferências</span>
        <h1>Configurações</h1>
        <p>Ajustes individuais da sua interface no EmDia.</p>
      </section>
      <form method="post" action="/settings" class="panel form-stack form-compact settings-form">
        ${csrfInput(user)}
        <details class="settings-section" data-persistent-details data-settings-section data-storage-key="emdia.settings.fontScale.open" open>
          <summary>Tamanho da fonte</summary>
          <fieldset class="choice-group settings-section-body">
            <legend class="sr-only">Tamanho da fonte</legend>
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
        </details>
        <details class="settings-section" data-persistent-details data-settings-section data-storage-key="emdia.settings.listDensity.open" open>
          <summary>Densidade das listagens</summary>
          <fieldset class="choice-group settings-section-body">
            <legend class="sr-only">Densidade das listagens</legend>
            ${LIST_DENSITY_OPTIONS.map(
              ([value, label, description]) => `
                <label class="choice-card">
                  <input type="radio" name="list_density" value="${value}"${normalizeListDensity(user.list_density) === value ? " checked" : ""}>
                  <span>
                    <strong>${label}</strong>
                    <small>${description}</small>
                  </span>
                </label>`
            ).join("")}
          </fieldset>
        </details>
        <div class="form-actions">
          ${buttonLink({ href: "/dashboard", label: "Voltar", icon: "arrow-left" })}
          <button type="submit">${buttonContent("Salvar configurações", "save")}</button>
        </div>
      </form>
    `,
  });
}

module.exports = {
  settingsView,
};
