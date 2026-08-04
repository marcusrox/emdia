const assert = require("node:assert/strict");
const { beforeEach, describe, it } = require("node:test");
const Notification = require("../../src/models/Notification");
const NotificationPreference = require("../../src/models/NotificationPreference");
const {
  EVENT_TYPES,
  enqueueReceiptNotification,
  idempotencyKey,
} = require("../../src/services/receiptNotificationService");
const { settingsView } = require("../../src/views/settingsView");
const { createUser, db, resetDatabase } = require("../helpers/testDatabase");

beforeEach(() => {
  resetDatabase();
  delete process.env.APP_BASE_URL;
});

describe("notificações de comprovantes pelo WhatsApp", () => {
  it("cria as quatro preferências habilitadas sem ativar o canal geral", () => {
    const user = createUser({ phoneE164: "+5511999999999" });
    const preferences = NotificationPreference.getOrCreate(user.id);

    assert.equal(preferences.whatsapp_enabled, 0);
    assert.equal(preferences.receipt_queue_failure_enabled, 1);
    assert.equal(preferences.receipt_processing_failure_enabled, 1);
    assert.equal(preferences.receipt_ready_review_enabled, 1);
    assert.equal(preferences.receipt_approved_enabled, 1);
  });

  it("salva cada preferência de forma independente e preserva lembretes existentes", () => {
    const user = createUser({ phoneE164: "+5511999999999" });
    const preferences = NotificationPreference.update(user.id, {
      whatsapp_enabled: "on",
      daily_summary_enabled: "on",
      daily_summary_time: "09:30",
      due_reminder_offsets: "7, 1",
      overdue_reminder_interval_days: "4",
      receipt_queue_failure_enabled: "on",
      receipt_ready_review_enabled: "on",
    });

    assert.equal(preferences.whatsapp_enabled, 1);
    assert.equal(preferences.daily_summary_enabled, 1);
    assert.equal(preferences.daily_summary_time, "09:30");
    assert.equal(preferences.due_reminder_offsets_json, "[7,1]");
    assert.equal(preferences.overdue_reminder_interval_days, 4);
    assert.equal(preferences.receipt_queue_failure_enabled, 1);
    assert.equal(preferences.receipt_processing_failure_enabled, 0);
    assert.equal(preferences.receipt_ready_review_enabled, 1);
    assert.equal(preferences.receipt_approved_enabled, 0);
  });

  it("enfileira cada evento uma única vez e respeita a chave geral", () => {
    const user = createUser({ phoneE164: "+5511999999999" });
    NotificationPreference.update(user.id, {
      whatsapp_enabled: "on",
      receipt_queue_failure_enabled: "on",
      receipt_processing_failure_enabled: "on",
      receipt_ready_review_enabled: "on",
      receipt_approved_enabled: "on",
    });

    const input = {
      eventType: EVENT_TYPES.READY_FOR_REVIEW,
      userId: user.id,
      receiptId: "rcp_notification_test",
    };
    const first = enqueueReceiptNotification(input);
    const second = enqueueReceiptNotification(input);
    assert.equal(first.id, second.id);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM notifications").get().total, 1);
    assert.equal(Notification.listPending(1)[0].user_email, user.email);

    db.prepare("UPDATE notification_preferences SET whatsapp_enabled = 0 WHERE user_id = ?").run(user.id);
    const blocked = enqueueReceiptNotification({
      eventType: EVENT_TYPES.APPROVED,
      userId: user.id,
      receiptId: "rcp_notification_test",
    });
    assert.equal(blocked, null);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM notifications").get().total, 1);
  });

  it("inclui link de revisão somente com APP_BASE_URL válida", () => {
    const user = createUser({ phoneE164: "+5511999999999" });
    NotificationPreference.update(user.id, {
      whatsapp_enabled: "on",
      receipt_ready_review_enabled: "on",
    });

    process.env.APP_BASE_URL = "https://emdia.example.test";
    const linked = enqueueReceiptNotification({
      eventType: EVENT_TYPES.READY_FOR_REVIEW,
      userId: user.id,
      receiptId: "rcp_linked",
    });
    assert.match(JSON.parse(linked.payload_json).message, /https:\/\/emdia\.example\.test\/receipt-imports\/rcp_linked/);

    process.env.APP_BASE_URL = "javascript:alert(1)";
    const unlinked = enqueueReceiptNotification({
      eventType: EVENT_TYPES.READY_FOR_REVIEW,
      userId: user.id,
      receiptId: "rcp_unlinked",
    });
    assert.doesNotMatch(JSON.parse(unlinked.payload_json).message, /javascript:|Abrir:/);
  });

  it("protege a referência do provedor na chave da falha anterior à fila", () => {
    const providerMessageId = "5511999999999@c.us_sensitive-message";
    const key = idempotencyKey({ provider: "WAHA", providerMessageId }, "queue-failed");
    assert.match(key, /^receipt:waha:[a-f0-9]{32}:queue-failed$/);
    assert.doesNotMatch(key, /5511999999999|sensitive-message/);
  });

  it("renderiza os quatro controles na seção de WhatsApp", () => {
    const user = createUser({ phoneE164: "+5511999999999" });
    const html = settingsView({
      user: { ...user, csrfToken: "csrf-test" },
      notificationPreferences: NotificationPreference.getOrCreate(user.id),
    });

    assert.match(html, /Notificações por WhatsApp/);
    assert.match(html, /name="receipt_queue_failure_enabled"/);
    assert.match(html, /name="receipt_processing_failure_enabled"/);
    assert.match(html, /name="receipt_ready_review_enabled"/);
    assert.match(html, /name="receipt_approved_enabled"/);
    assert.match(html, /Quando o comprovante entra na fila sem erros, nenhuma confirmação é enviada/);
    assert.match(html, /class="settings-notification-options"/);
    assert.match(html, /class="settings-reminder-schedule field-span-2"/);
    assert.match(html, /settings-status-card settings-status-card-compact is-loading/);
    assert.match(html, /settings-status-value settings-status-loading/);
    assert.doesNotMatch(html, /choice-card field-span-2">\s*<input type="checkbox" name="whatsapp_enabled"/);
  });
});
