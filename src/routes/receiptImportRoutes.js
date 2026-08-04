const Account = require("../models/FinancialAccount");
const Category = require("../models/Category");
const FinancialEntry = require("../models/FinancialEntry");
const ReceiptImport = require("../models/ReceiptImport");
const { logInfo } = require("../services/operationalLogger");
const { queryValue, redirect, sendHtml } = require("../services/http");
const { toCents } = require("../services/moneyService");
const { eligibleEntries, findReceiptMatches } = require("../services/receiptMatchingService");
const { getStoredReceipt } = require("../services/receiptStorageService");
const { wakeReceiptImportWorker } = require("../services/receiptImportWorker");
const {
  EVENT_TYPES,
  enqueueReceiptNotificationSafely,
} = require("../services/receiptNotificationService");
const { notFoundView, receiptImportDetailView, receiptImportsListView } = require("../services/viewEngine");

function registerReceiptImportRoutes(app, { requireCsrf }) {
  app.get("/receipt-imports", (req, res) => sendHtml(res, receiptImportsListView({
    user: req.user,
    imports: ReceiptImport.listForUser(req.user.id, { status: queryValue(req, "status") }),
    filters: { status: queryValue(req, "status") },
    notifications: notifications(req),
  })));

  app.get("/receipt-imports/:id/media", (req, res) => {
    const receipt = ReceiptImport.getForUser(req.user.id, req.params.id);
    if (!receipt || !receipt.storage_key || receipt.status === ReceiptImport.STATUS.REJECTED) return res.status(404).end();
    try {
      const stored = getStoredReceipt(receipt.storage_key);
      res.set({
        "Content-Type": receipt.media_mime_type,
        "Content-Length": String(stored.sizeBytes),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300",
      });
      return res.sendFile(stored.filePath);
    } catch { return res.status(404).end(); }
  });

  app.get("/receipt-imports/:id", (req, res) => renderDetail(req, res));

  app.post("/receipt-imports/:id/approve", requireCsrf, (req, res) => {
    const result = ReceiptImport.approve(req.user, req.params.id, req.body);
    if (!result.ok) {
      if (result.reason === "not-found") return sendHtml(res, notFoundView(req.user), 404);
      if (result.reason === "validation") return renderDetail(req, res, { errors: result.errors, values: req.body, status: 400 });
      return redirect(res, `/receipt-imports/${encodeURIComponent(req.params.id)}?invalid_status=1`);
    }
    logInfo("whatsapp.receipt.approved", result.action === "EXISTING"
      ? "Comprovante aprovado e vinculado à baixa de lançamento existente."
      : "Comprovante aprovado e convertido em despesa.", {
      user: req.user,
      entity: "receipt_import",
      entityId: req.params.id,
    });
    enqueueReceiptNotificationSafely({
      eventType: EVENT_TYPES.APPROVED,
      userId: req.user.id,
      receiptId: req.params.id,
    });
    return redirect(res, `/receipt-imports/${encodeURIComponent(req.params.id)}?approved=${result.action === "EXISTING" ? "existing" : "new"}`);
  });

  app.post("/receipt-imports/:id/reject", requireCsrf, (req, res) => {
    const result = ReceiptImport.reject(req.user.id, req.params.id);
    if (!result.ok && result.reason === "not-found") return sendHtml(res, notFoundView(req.user), 404);
    if (result.ok) logInfo("whatsapp.receipt.rejected", "Comprovante rejeitado pelo usuário.", { user: req.user, entity: "receipt_import", entityId: req.params.id });
    return redirect(res, `/receipt-imports/${encodeURIComponent(req.params.id)}?rejected=${result.ok ? "1" : "0"}`);
  });

  app.post("/receipt-imports/:id/reprocess", requireCsrf, (req, res) => {
    const result = ReceiptImport.reprocess(req.user.id, req.params.id);
    if (!result.ok && result.reason === "not-found") return sendHtml(res, notFoundView(req.user), 404);
    if (result.ok) wakeReceiptImportWorker();
    return redirect(res, `/receipt-imports/${encodeURIComponent(req.params.id)}?reprocessed=${result.ok ? "1" : "0"}`);
  });
}

function renderDetail(req, res, options = {}) {
  const receipt = ReceiptImport.getForUser(req.user.id, req.params.id);
  if (!receipt) return sendHtml(res, notFoundView(req.user), 404);
  const openEntries = eligibleEntries(FinancialEntry.listOpenExpenses(req.user));
  const matchingReceipt = matchingValues(receipt, options.values);
  const matches = findReceiptMatches(matchingReceipt, openEntries);
  const matchedIds = new Set(matches.map((entry) => entry.id));
  return sendHtml(res, receiptImportDetailView({
    user: req.user,
    receipt,
    categories: Category.byType(req.user.id, "EXPENSE").filter((item) => item.is_active),
    accounts: Account.active(req.user.id),
    matches,
    openEntries: openEntries.filter((entry) => !matchedIds.has(entry.id)),
    errors: options.errors,
    values: options.values,
    notifications: notifications(req),
  }), options.status || 200);
}

function notifications(req) {
  if (queryValue(req, "approved") === "existing") return [{ type: "success", message: "Baixa vinculada ao lançamento existente com sucesso." }];
  if (["1", "new"].includes(queryValue(req, "approved"))) return [{ type: "success", message: "Despesa e pagamento criados com sucesso." }];
  if (queryValue(req, "rejected") === "1") return [{ type: "success", message: "Comprovante rejeitado." }];
  if (queryValue(req, "reprocessed") === "1") return [{ type: "info", message: "Comprovante enviado novamente para processamento." }];
  if (queryValue(req, "invalid_status") === "1") return [{ type: "error", message: "O comprovante não pode mais ser alterado neste status." }];
  return [];
}

function matchingValues(receipt, values = {}) {
  let amountCents = receipt.amount_cents;
  if (values.amount !== undefined) {
    try { amountCents = toCents(values.amount); } catch { /* Usa a extração como fallback. */ }
  }
  return {
    merchant_name: values.party_name ?? receipt.merchant_name,
    payment_date: values.payment_date ?? receipt.payment_date,
    amount_cents: amountCents,
  };
}

module.exports = { registerReceiptImportRoutes };
