const Account = require("../models/FinancialAccount");
const Category = require("../models/Category");
const ReceiptImport = require("../models/ReceiptImport");
const { logInfo } = require("../services/operationalLogger");
const { queryValue, redirect, sendHtml } = require("../services/http");
const { getStoredReceipt } = require("../services/receiptStorageService");
const { wakeReceiptImportWorker } = require("../services/receiptImportWorker");
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
    logInfo("whatsapp.receipt.approved", "Comprovante aprovado e convertido em despesa.", {
      user: req.user,
      entity: "receipt_import",
      entityId: req.params.id,
    });
    return redirect(res, `/receipt-imports/${encodeURIComponent(req.params.id)}?approved=1`);
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
  return sendHtml(res, receiptImportDetailView({
    user: req.user,
    receipt,
    categories: Category.byType(req.user.id, "EXPENSE").filter((item) => item.is_active),
    accounts: Account.active(req.user.id),
    errors: options.errors,
    values: options.values,
    notifications: notifications(req),
  }), options.status || 200);
}

function notifications(req) {
  if (queryValue(req, "approved") === "1") return [{ type: "success", message: "Despesa e pagamento criados com sucesso." }];
  if (queryValue(req, "rejected") === "1") return [{ type: "success", message: "Comprovante rejeitado." }];
  if (queryValue(req, "reprocessed") === "1") return [{ type: "info", message: "Comprovante enviado novamente para processamento." }];
  if (queryValue(req, "invalid_status") === "1") return [{ type: "error", message: "O comprovante não pode mais ser alterado neste status." }];
  return [];
}

module.exports = { registerReceiptImportRoutes };
