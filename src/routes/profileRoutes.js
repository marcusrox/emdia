const AuditLog = require("../models/AuditLog");
const NotificationPreference = require("../models/NotificationPreference");
const User = require("../models/User");
const { getWhatsAppStatus } = require("../services/notificationService");
const { logInfo, logWarn } = require("../services/operationalLogger");
const { logBusinessError } = require("../services/errorLogging");
const {
  queryValue,
  redirect,
  requestDetails,
  sendHtml,
  sendJson,
} = require("../services/http");
const {
  auditView,
  profileView,
  settingsView,
} = require("../services/viewEngine");

function registerProfileRoutes(app, { requireCsrf }) {
  app.get("/profile", (req, res) => {
    return sendHtml(res, profileView({ user: req.user, saved: queryValue(req, "saved") === "1" }));
  });

  app.post("/profile", requireCsrf, (req, res) => {
    const result = User.updateProfile(req.user.id, req.body);
    if (!result.ok) {
      logWarn("business.validation.failed", "Validação de perfil falhou.", {
        user: req.user,
        entity: "user",
        entityId: req.user.id,
        details: requestDetails(req, {
          fields: Object.keys(result.errors || {}),
        }),
      });
      const profile = { ...req.user, ...result.profile };
      return sendHtml(res, profileView({ user: req.user, profile, errors: result.errors }), 400);
    }

    AuditLog.record(req.user.id, "user", req.user.id, "profile_updated", {
      name: result.user.name,
      email: result.user.email,
      phone_changed: req.body.phone_e164 !== req.user.phone_e164,
      password_changed: Boolean(req.body.new_password),
    });
    return redirect(res, "/profile?saved=1");
  });

  app.get("/settings", (req, res) => {
    const notificationPreferences = NotificationPreference.getOrCreate(req.user.id);
    return sendHtml(
      res,
      settingsView({
        user: req.user,
        saved: queryValue(req, "saved") === "1",
        notificationPreferences,
      })
    );
  });

  app.get("/settings/whatsapp-status", async (req, res) => {
    try {
      const status = await getWhatsAppStatus();
      return sendJson(res, {
        ok: Boolean(status?.ok),
        state: String(status?.state || "UNKNOWN"),
        message: String(status?.message || status?.provider || "WhatsApp outbound"),
      });
    } catch (error) {
      logBusinessError(
        req,
        "whatsapp.connection_state_failed",
        "Falha inesperada ao consultar o estado do WhatsApp.",
        error
      );
      return sendJson(
        res,
        {
          ok: false,
          state: "ERROR",
          message: "Não foi possível consultar a integração com o WhatsApp.",
        },
        503
      );
    }
  });

  app.post("/settings", requireCsrf, (req, res) => {
    User.updateInterfacePreferences(req.user.id, req.body);
    const notificationPreferences = NotificationPreference.update(req.user.id, req.body);
    AuditLog.record(req.user.id, "settings", req.user.id, "settings_updated", {
      font_scale: req.body.font_scale,
      list_density: req.body.list_density,
      whatsapp_enabled: Boolean(notificationPreferences.whatsapp_enabled),
      daily_summary_enabled: Boolean(notificationPreferences.daily_summary_enabled),
      receipt_queue_failure_enabled: Boolean(notificationPreferences.receipt_queue_failure_enabled),
      receipt_processing_failure_enabled: Boolean(notificationPreferences.receipt_processing_failure_enabled),
      receipt_ready_review_enabled: Boolean(notificationPreferences.receipt_ready_review_enabled),
      receipt_approved_enabled: Boolean(notificationPreferences.receipt_approved_enabled),
    });
    logInfo("sensitive.settings.updated", "Preferências de interface atualizadas.", {
      user: req.user,
      entity: "user",
      entityId: req.user.id,
      details: requestDetails(req),
    });
    return redirect(res, "/settings?saved=1");
  });

  app.get("/audit", (req, res) => {
    const filters = {
      from_date: queryValue(req, "from_date"),
      to_date: queryValue(req, "to_date"),
      entity_type: queryValue(req, "entity_type"),
      action: queryValue(req, "action"),
      q: queryValue(req, "q"),
    };

    return sendHtml(res, auditView({ user: req.user, entries: AuditLog.list(req.user.id, filters), filters }));
  });
}

module.exports = {
  registerProfileRoutes,
};
