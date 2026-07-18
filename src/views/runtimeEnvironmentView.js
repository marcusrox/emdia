const { layout } = require("./layout");
const { escapeHtml, lucideIcon, pageHeading } = require("../services/viewHelpers");

function runtimeEnvironmentView({ user, environment }) {
  return layout({
    title: "Ambiente de execução",
    user,
    active: "/runtime-environment",
    body: `
      ${pageHeading({
        eyebrow: "Diagnóstico técnico",
        title: "Ambiente de execução",
        description: "Informações do processo atual para suporte e diagnóstico.",
        actions: `<span class="queue-admin-chip">${lucideIcon("shield-check")} Acesso administrativo</span>`,
      })}
      <section class="runtime-summary" aria-label="Resumo do ambiente">
        ${environment.summary.map(summaryCard).join("")}
      </section>
      <div class="runtime-section-grid">
        ${detailPanel("Aplicação", "package-check", environment.application)}
        ${detailPanel("Sistema operacional", "monitor-cog", environment.operatingSystem)}
        ${detailPanel("Node.js e processo", "cpu", environment.process, "runtime-panel-wide")}
      </div>
      ${installedModulesPanel(environment.installedModules)}
      ${loadedModulesPanel(environment.loadedModules)}
      ${environmentVariablesPanel(environment.environmentVariables)}
      ${configurationsPanel(environment.configurations)}
      <p class="runtime-collection-note">
        ${lucideIcon("shield-check")}
        <span>Dados coletados em ${escapeHtml(environment.application.find((item) => item.label === "Coletado em")?.value || environment.collectedAt)}. Valores sensíveis e identificadores da máquina são omitidos no servidor.</span>
      </p>
    `,
  });
}

function summaryCard(item) {
  return `<article class="runtime-summary-card runtime-tone-${escapeHtml(item.tone)}">
    <span class="runtime-summary-icon">${lucideIcon(item.icon)}</span>
    <div>
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>
  </article>`;
}

function detailPanel(title, icon, items, className = "") {
  return `<section class="panel runtime-panel ${escapeHtml(className)}">
    ${panelTitle(title, icon)}
    <dl class="runtime-detail-list">
      ${items.map((item) => `<div>
        <dt>${escapeHtml(item.label)}</dt>
        <dd${item.mono ? ' class="runtime-mono"' : ""}>${escapeHtml(item.value)}</dd>
      </div>`).join("")}
    </dl>
  </section>`;
}

function installedModulesPanel(modules) {
  return `<section class="panel runtime-panel runtime-table-panel">
    ${panelTitle("Módulos instalados", "package-open", `${modules.length} dependências diretas declaradas`)}
    <p class="runtime-section-help">Dependências diretas declaradas no projeto e suas versões resolvidas localmente.</p>
    <div class="table-wrap">
      <table class="runtime-table">
        <thead><tr><th>Módulo</th><th>Versão declarada</th><th>Versão resolvida</th><th>Estado</th></tr></thead>
        <tbody>
          ${modules.map((module) => `<tr>
            <td><code>${escapeHtml(module.name)}</code></td>
            <td><code>${escapeHtml(module.declaredVersion)}</code></td>
            <td><code>${escapeHtml(module.resolvedVersion)}</code></td>
            <td>${statusBadge(module.state, module.tone)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </section>`;
}

function loadedModulesPanel(modules) {
  return `<section class="panel runtime-panel runtime-table-panel">
    ${panelTitle("Módulos carregados", "boxes", `${modules.project.length} internos · ${modules.external.length} externos`)}
    <p class="runtime-section-help">Retrato do cache CommonJS neste processo até o instante da coleta; não representa todos os módulos instalados.</p>
    <div class="runtime-loaded-grid">
      ${moduleList("Módulos do EmDia", "folder-tree", modules.project)}
      ${moduleList("Pacotes externos", "package", modules.external)}
    </div>
  </section>`;
}

function moduleList(title, icon, modules) {
  return `<section class="runtime-module-list">
    <h3>${lucideIcon(icon)}<span>${escapeHtml(title)}</span><small>${escapeHtml(modules.length)}</small></h3>
    ${modules.length
      ? `<ul>${modules.map((module) => `<li><code>${escapeHtml(module)}</code></li>`).join("")}</ul>`
      : '<p class="runtime-empty">Nenhum módulo identificado.</p>'}
  </section>`;
}

function environmentVariablesPanel(variables) {
  return `<section class="panel runtime-panel runtime-table-panel">
    ${panelTitle("Variáveis de ambiente", "list-checks", "Lista permitida e valores protegidos")}
    <p class="runtime-section-help">Somente chaves conhecidas pelo EmDia são listadas. Segredos, URLs e caminhos têm seus valores omitidos antes da renderização.</p>
    <div class="table-wrap">
      <table class="runtime-table">
        <thead><tr><th>Variável</th><th>Estado</th><th>Valor público</th></tr></thead>
        <tbody>
          ${variables.map((variable) => `<tr>
            <td><code>${escapeHtml(variable.name)}</code></td>
            <td>${statusBadge(variable.state, variable.tone)}</td>
            <td><code>${escapeHtml(variable.value)}</code></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </section>`;
}

function configurationsPanel(configurations) {
  return `<section class="panel runtime-panel runtime-table-panel">
    ${panelTitle("Configurações úteis", "settings-2", "Resumo seguro do processo")}
    <div class="runtime-config-grid">
      ${configurations.map((item) => `<article class="runtime-config-item">
        <span class="runtime-config-icon">${lucideIcon(item.icon)}</span>
        <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>
        ${item.state ? statusBadge(item.state, stateTone(item.state)) : ""}
      </article>`).join("")}
    </div>
  </section>`;
}

function panelTitle(title, icon, meta = "") {
  return `<div class="panel-heading runtime-panel-heading">
    <h2>${lucideIcon(icon)}<span>${escapeHtml(title)}</span></h2>
    ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
  </div>`;
}

function statusBadge(label, tone = "neutral") {
  return `<span class="runtime-status runtime-status-${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function stateTone(state) {
  if (["Configurado", "Habilitado"].includes(state)) return "success";
  if (["Incompleto", "Não reconhecido"].includes(state)) return "warning";
  return "neutral";
}

module.exports = {
  runtimeEnvironmentView,
};
