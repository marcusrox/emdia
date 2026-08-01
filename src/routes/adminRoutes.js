const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { logInfo, logWarn } = require("../services/operationalLogger");
const {
  queryValue,
  redirect,
  requestDetails,
  sendHtml,
} = require("../services/http");
const {
  notFoundView,
  notificationQueueView,
  userAdminFormView,
  usersAdminListView,
} = require("../services/viewEngine");

function registerAdminRoutes(app, { requireAdmin, requireCsrf }) {
  app.get("/admin/users", requireAdmin, (req, res) => {
    const filters = adminUserFilters(req);
    return sendHtml(res, usersAdminListView({
      user: req.user,
      users: User.listForAdmin(filters),
      filters,
      notifications: adminUserMessages(req),
    }));
  });

  app.get("/admin/users/new", requireAdmin, (req, res) => {
    return sendHtml(res, userAdminFormView({
      user: req.user,
      target: { timezone: req.user.timezone || "America/Sao_Paulo", locale: req.user.locale || "pt-BR", is_active: 1 },
      action: "/admin/users",
      isNew: true,
    }));
  });

  app.post("/admin/users", requireAdmin, requireCsrf, (req, res) => {
    const result = User.createAdmin(req.body);
    if (!result.ok) {
      logWarn("admin.user.validation_failed", "Cadastro administrativo de usuário recusado.", {
        user: req.user, entity: "user", details: requestDetails(req, { fields: Object.keys(result.errors) }),
      });
      return sendHtml(res, userAdminFormView({
        user: req.user, target: result.values, action: "/admin/users", isNew: true, errors: result.errors,
      }), 400);
    }
    AuditLog.record(req.user.id, "user", result.user.id, "admin_created", {
      target_user_id: result.user.id, name: result.user.name, email: result.user.email,
      is_admin: Boolean(result.user.is_admin), is_active: Boolean(result.user.is_active),
    });
    logInfo("admin.user.created", "Usuário criado por administrador.", {
      user: req.user, entity: "user", entityId: result.user.id, details: requestDetails(req),
    });
    return redirect(res, "/admin/users?notice=created");
  });

  app.get("/admin/users/:id/edit", requireAdmin, (req, res) => {
    const target = User.getAdminById(req.params.id);
    if (!target) return sendHtml(res, notFoundView(req.user), 404);
    return sendHtml(res, userAdminFormView({
      user: req.user, target, action: `/admin/users/${encodeURIComponent(target.id)}`,
      notifications: adminUserMessages(req),
    }));
  });

  app.post("/admin/users/:id", requireAdmin, requireCsrf, (req, res) => {
    const result = User.updateAdmin(req.user.id, req.params.id, req.body);
    if (result.notFound) return sendHtml(res, notFoundView(req.user), 404);
    if (!result.ok) {
      logWarn("admin.user.validation_failed", "Alteração administrativa de usuário recusada.", {
        user: req.user, entity: "user", entityId: req.params.id,
        details: requestDetails(req, { fields: Object.keys(result.errors) }),
      });
      return sendHtml(res, userAdminFormView({
        user: req.user, target: result.values, action: `/admin/users/${encodeURIComponent(req.params.id)}`, errors: result.errors,
      }), 400);
    }
    const auditAction = !result.previous.is_admin && result.user.is_admin
      ? "promoted_to_admin"
      : result.previous.is_admin && !result.user.is_admin
        ? "demoted_to_user"
        : "admin_updated";
    AuditLog.record(req.user.id, "user", result.user.id, auditAction, {
      target_user_id: result.user.id,
      before: adminUserAuditSnapshot(result.previous), after: adminUserAuditSnapshot(result.user),
    });
    logInfo("admin.user.updated", "Usuário alterado por administrador.", {
      user: req.user, entity: "user", entityId: result.user.id, details: requestDetails(req),
    });
    return redirect(res, `/admin/users/${encodeURIComponent(result.user.id)}/edit?notice=updated`);
  });

  app.post("/admin/users/:id/block", requireAdmin, requireCsrf, (req, res) => {
    const result = User.setActiveAdmin(req.user.id, req.params.id, false);
    if (!result.ok) {
      logWarn("admin.user.block_refused", "Bloqueio administrativo de usuário recusado.", {
        user: req.user, entity: "user", entityId: req.params.id,
        details: requestDetails(req, { reason: result.reason }),
      });
      return redirect(res, `/admin/users?notice=${encodeURIComponent(result.reason)}`);
    }
    AuditLog.record(req.user.id, "user", result.user.id, "blocked", { target_user_id: result.user.id });
    logInfo("admin.user.blocked", "Usuário bloqueado e sessões revogadas.", {
      user: req.user, entity: "user", entityId: result.user.id, details: requestDetails(req),
    });
    return redirect(res, "/admin/users?notice=blocked");
  });

  app.post("/admin/users/:id/unblock", requireAdmin, requireCsrf, (req, res) => {
    const result = User.setActiveAdmin(req.user.id, req.params.id, true);
    if (!result.ok) return redirect(res, `/admin/users?notice=${encodeURIComponent(result.reason)}`);
    AuditLog.record(req.user.id, "user", result.user.id, "unblocked", { target_user_id: result.user.id });
    logInfo("admin.user.unblocked", "Usuário desbloqueado por administrador.", {
      user: req.user, entity: "user", entityId: result.user.id, details: requestDetails(req),
    });
    return redirect(res, "/admin/users?notice=unblocked");
  });

  app.post("/admin/users/:id/reset-password", requireAdmin, requireCsrf, (req, res) => {
    const result = User.resetPasswordAdmin(req.params.id, req.body);
    if (result.notFound) return sendHtml(res, notFoundView(req.user), 404);
    if (!result.ok) {
      const target = User.getAdminById(req.params.id);
      logWarn("admin.user.password_validation_failed", "Redefinição administrativa de senha recusada.", {
        user: req.user, entity: "user", entityId: req.params.id,
        details: requestDetails(req, { fields: Object.keys(result.errors) }),
      });
      return sendHtml(res, userAdminFormView({
        user: req.user, target, action: `/admin/users/${encodeURIComponent(req.params.id)}`, errors: result.errors,
      }), 400);
    }
    AuditLog.record(req.user.id, "user", result.user.id, "password_reset", {
      target_user_id: result.user.id, credential_changed: true,
    });
    logInfo("admin.user.password_reset", "Senha redefinida por administrador e sessões revogadas.", {
      user: req.user, entity: "user", entityId: result.user.id, details: requestDetails(req),
    });
    return redirect(res, `/admin/users/${encodeURIComponent(result.user.id)}/edit?notice=password-reset`);
  });

  app.get("/admin/notifications", requireAdmin, (req, res) => {
    const filters = notificationQueueFilters(req);
    return sendHtml(res, notificationQueueView({
      user: req.user,
      entries: Notification.listForAdmin(filters),
      users: User.listAll(),
      filters,
      notifications: notificationQueueMessages(req),
    }));
  });

  app.post("/admin/notifications/:id/resend", requireAdmin, requireCsrf, (req, res) => {
    const resent = Notification.resend(req.params.id);
    if (!resent) return redirect(res, "/admin/notifications?notice=not-found");

    AuditLog.record(req.user.id, "notification", resent.id, "resent", {
      source_notification_id: req.params.id,
      target_user_id: resent.user_id,
    });
    return redirect(res, "/admin/notifications?notice=resent");
  });

  app.post("/admin/notifications/:id/cancel", requireAdmin, requireCsrf, (req, res) => {
    const cancelled = Notification.cancel(req.params.id);
    if (!cancelled) return redirect(res, "/admin/notifications?notice=not-cancellable");

    AuditLog.record(req.user.id, "notification", req.params.id, "cancelled", {
      target_user_id: cancelled.user_id,
    });
    return redirect(res, "/admin/notifications?notice=cancelled");
  });
}

function adminUserFilters(req) {
  return {
    q: queryValue(req, "q"),
    role: queryValue(req, "role"),
    status: queryValue(req, "status"),
  };
}

function adminUserMessages(req) {
  const messages = {
    created: { type: "success", message: "Usuário criado com sucesso." },
    updated: { type: "success", message: "Dados e perfil atualizados com sucesso." },
    blocked: { type: "success", message: "Usuário bloqueado e sessões encerradas." },
    unblocked: { type: "success", message: "Usuário desbloqueado. Um novo login será necessário." },
    "password-reset": { type: "success", message: "Senha redefinida e sessões encerradas." },
    "self-block": { type: "warning", message: "Você não pode bloquear a própria conta." },
    "last-admin": { type: "warning", message: "Não é possível bloquear o último administrador ativo." },
    "not-found": { type: "error", message: "Usuário não encontrado." },
  };
  return [messages[queryValue(req, "notice")]].filter(Boolean);
}

function adminUserAuditSnapshot(user) {
  return {
    name: user.name,
    email: user.email,
    phone_e164: user.phone_e164 || null,
    timezone: user.timezone,
    locale: user.locale,
    is_admin: Boolean(user.is_admin),
    is_active: Boolean(user.is_active),
  };
}

function notificationQueueFilters(req) {
  return {
    user_id: queryValue(req, "user_id"),
    status: queryValue(req, "status"),
    channel: queryValue(req, "channel"),
    event_type: queryValue(req, "event_type"),
    q: queryValue(req, "q"),
    limit: queryValue(req, "limit"),
  };
}

function notificationQueueMessages(req) {
  const messages = {
    resent: { type: "success", message: "Notificação adicionada novamente à fila." },
    cancelled: { type: "success", message: "Notificação cancelada com sucesso." },
    "not-found": { type: "error", message: "Notificação não encontrada." },
    "not-cancellable": { type: "warning", message: "Somente notificações pendentes ou com falha podem ser canceladas." },
  };
  return [messages[queryValue(req, "notice")]].filter(Boolean);
}

module.exports = {
  registerAdminRoutes,
};
