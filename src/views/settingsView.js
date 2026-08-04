const {
  FONT_SCALE_OPTIONS,
  LIST_DENSITY_OPTIONS,
  buttonContent,
  buttonLink,
  csrfInput,
  escapeHtml,
  lucideIcon,
  normalizeFontScale,
  normalizeListDensity,
  pageHeading,
} = require("../services/viewHelpers");
const { layout } = require("./layout");

function settingsView({ user, saved = false, notificationPreferences }) {
  const preferences = notificationPreferences || {};
  const offsets = parseOffsets(preferences.due_reminder_offsets_json);
  const whatsappEnabled = Boolean(preferences.whatsapp_enabled);
  const dailySummaryEnabled = preferences.daily_summary_enabled !== 0;
  const receiptQueueFailureEnabled = preferences.receipt_queue_failure_enabled !== 0;
  const receiptProcessingFailureEnabled = preferences.receipt_processing_failure_enabled !== 0;
  const receiptReadyReviewEnabled = preferences.receipt_ready_review_enabled !== 0;
  const receiptApprovedEnabled = preferences.receipt_approved_enabled !== 0;

  return layout({
    title: "Configurações",
    user,
    active: "",
    notifications: saved ? [{ type: "success", message: "Configuração salva com sucesso." }] : [],
    body: `
      ${pageHeading({
        eyebrow: "Preferências",
        title: "Configurações",
        icon: "settings",
        description: "Ajustes individuais da sua interface no EmDia.",
      })}
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
        <details class="settings-section" data-persistent-details data-settings-section data-storage-key="emdia.settings.notifications.open" open>
          <summary>Notificações por WhatsApp</summary>
          <div class="settings-section-body form-grid form-short">
            <label class="choice-card">
              <input type="checkbox" name="whatsapp_enabled"${whatsappEnabled ? " checked" : ""}>
              <span>
                <strong>Enviar notificações pelo WhatsApp</strong>
                <small>${user.phone_e164 ? `Envio para ${escapeHtml(user.phone_e164)}.` : "Cadastre um telefone no Perfil para receber mensagens."}</small>
              </span>
            </label>
            <div class="settings-status-card settings-status-card-compact is-loading" data-whatsapp-status data-status-url="/settings/whatsapp-status" aria-live="polite" aria-busy="true">
              <span>Status da integração</span>
              <div class="settings-status-value settings-status-loading" data-whatsapp-status-loading>
                <span class="settings-status-spinner" aria-hidden="true"></span>
                <strong data-whatsapp-status-state>Verificando integração...</strong>
              </div>
            </div>
            <label class="choice-card field-span-2">
              <input type="checkbox" name="daily_summary_enabled"${dailySummaryEnabled ? " checked" : ""}>
              <span>
                <strong>Resumo diário</strong>
                <small>Enviar um resumo quando houver vencimentos, atrasos ou pendências próximas.</small>
              </span>
            </label>
            <div class="settings-reminder-schedule field-span-2">
              <label>Horário do resumo
                <input type="time" name="daily_summary_time" value="${escapeHtml(preferences.daily_summary_time || "08:00")}">
              </label>
              <label>Dias antes do vencimento
                <input name="due_reminder_offsets" value="${escapeHtml(offsets.join(", "))}" placeholder="5, 2, 0">
              </label>
              <label>Repetir vencidas a cada
                <input name="overdue_reminder_interval_days" value="${escapeHtml(preferences.overdue_reminder_interval_days || 3)}" inputmode="numeric">
              </label>
            </div>
            <section class="settings-notification-group field-span-2" aria-labelledby="receipt-notifications-title">
              <div class="settings-notification-heading">
                <span class="settings-notification-icon" aria-hidden="true">${lucideIcon("receipt-text")}</span>
                <div>
                  <h3 id="receipt-notifications-title">Comprovantes pelo WhatsApp</h3>
                  <p>Escolha em quais etapas você quer receber uma mensagem.</p>
                </div>
              </div>
              <p class="settings-notification-note">
                ${lucideIcon("info")}
                <span>Quando o comprovante entra na fila sem erros, nenhuma confirmação é enviada.</span>
              </p>
              <div class="settings-notification-options">
                <label class="choice-card settings-notification-option">
                  <input type="checkbox" name="receipt_queue_failure_enabled"${receiptQueueFailureEnabled ? " checked" : ""}>
                  <span>
                    <strong>Falha no recebimento</strong>
                    <small>O comprovante não pôde entrar na fila.</small>
                  </span>
                </label>
                <label class="choice-card settings-notification-option">
                  <input type="checkbox" name="receipt_processing_failure_enabled"${receiptProcessingFailureEnabled ? " checked" : ""}>
                  <span>
                    <strong>Falha no processamento</strong>
                    <small>Todas as tentativas de processamento falharam.</small>
                  </span>
                </label>
                <label class="choice-card settings-notification-option">
                  <input type="checkbox" name="receipt_ready_review_enabled"${receiptReadyReviewEnabled ? " checked" : ""}>
                  <span>
                    <strong>Pronto para revisão</strong>
                    <small>O comprovante está disponível para conferência.</small>
                  </span>
                </label>
                <label class="choice-card settings-notification-option">
                  <input type="checkbox" name="receipt_approved_enabled"${receiptApprovedEnabled ? " checked" : ""}>
                  <span>
                    <strong>Comprovante aprovado</strong>
                    <small>A despesa e o pagamento foram registrados.</small>
                  </span>
                </label>
              </div>
            </section>
          </div>
        </details>
        <div class="form-actions">
          ${buttonLink({ href: "/dashboard", label: "Voltar", icon: "arrow-left" })}
          <button type="submit">${buttonContent("Salvar configurações", "save")}</button>
        </div>
      </form>
    `,
  });
}

function parseOffsets(value) {
  try {
    const parsed = JSON.parse(value || "[5,2,0]");
    return Array.isArray(parsed) ? parsed : [5, 2, 0];
  } catch (error) {
    return [5, 2, 0];
  }
}

module.exports = {
  settingsView,
};
