const { formatMoney } = require("../services/moneyService");
const { formatCivilDate } = require("../services/dateService");
const {
  buttonContent,
  buttonLink,
  csrfInput,
  escapeHtml,
  fieldError,
  fieldErrorAttributes,
  lucideIcon,
  moneyInput,
  option,
  pageHeading,
} = require("../services/viewHelpers");
const { layout } = require("./layout");

const STATUS_LABELS = {
  RECEIVED: "Recebido",
  PROCESSING: "Processando",
  NEEDS_REVIEW: "Revisar",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  FAILED: "Falhou",
};

const WARNING_EXPLANATIONS = {
  PMETH_INFERRED: "O meio de pagamento foi deduzido pelo contexto e deve ser conferido.",
  CATEGORY_LOW_CONFIDENCE: "A categoria sugerida tem baixa confiança e deve ser revisada.",
  TRANS_REF_PARTIAL: "A referência da transação foi identificada apenas parcialmente.",
  INVALID_AMOUNT: "O valor identificado no comprovante não pôde ser validado.",
  INVALID_PAYMENT_DATE: "A data de pagamento identificada não é válida.",
  LOW_OVERALL_CONFIDENCE: "A leitura automática teve baixa confiança geral; confira todos os dados.",
  DOCUMENT_REQUIRES_ATTENTION: "O tipo de documento exige conferência antes da aprovação.",
};

function receiptImportsListView({ user, imports, filters, notifications = [] }) {
  const rows = imports.length
    ? imports.map((receipt) => `<tr>
        <td><a href="/receipt-imports/${escapeHtml(receipt.id)}">${escapeHtml(receipt.merchant_name || "Comprovante sem favorecido")}</a></td>
        <td>${escapeHtml(formatCivilDate(receipt.payment_date, "A conferir"))}</td>
        <td>${receipt.amount_cents ? escapeHtml(formatMoney(receipt.amount_cents)) : "A conferir"}</td>
        <td><span class="status status-${escapeHtml(receipt.status.toLowerCase())}">${escapeHtml(STATUS_LABELS[receipt.status] || receipt.status)}</span></td>
        <td>${escapeHtml(formatDateTime(receipt.created_at, user.timezone))}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty-state">Nenhum comprovante encontrado.</td></tr>`;
  const statusOptions = [["", "Todos os status"], ...Object.entries(STATUS_LABELS)]
    .map(([value, label]) => option(value, label, filters.status)).join("");
  const body = `${pageHeading({
    eyebrow: "WhatsApp",
    title: "Comprovantes",
    icon: "receipt-text",
    description: "Confira os dados extraídos antes de criar a despesa e registrar o pagamento.",
  })}
    <div class="receipt-overview-grid">
      <section class="panel receipt-info-panel" aria-labelledby="receipt-info-title">
        <span class="receipt-info-icon" aria-hidden="true">${lucideIcon("message-circle")}</span>
        <div>
          <h2 id="receipt-info-title">Como funciona o envio pelo WhatsApp</h2>
          <p>Envie uma imagem JPEG ou PNG do comprovante para o WhatsApp do EmDia <a href="https://wa.me/5571996631800" target="_blank" rel="noopener noreferrer">(71) 99663-1800</a>. O sistema identifica o remetente pelo número do telefone, recebe a imagem e extrai automaticamente os principais dados do pagamento usando inteligência artificial.</p>
          <p>Aqui você poderá acompanhar o processamento e conferir os dados extraídos através de IA. Abra o comprovante para conferir as informações, escolher a conta e a categoria, aprovar, rejeitar ou reprocessar. A despesa paga e sua baixa só são criadas depois da sua aprovação.</p>
        </div>
      </section>
      <section class="panel receipt-filter-panel" aria-labelledby="receipt-filter-title">
        <h2 id="receipt-filter-title">Filtrar comprovantes</h2>
        <form method="get" action="/receipt-imports" class="receipt-filter-form">
          <label>Status <select name="status">${statusOptions}</select></label>
          <button type="submit">${buttonContent("Filtrar", "filter")}</button>
        </form>
      </section>
    </div>
    <section class="panel list-panel">
      <div class="table-scroll"><table>
        <thead><tr><th>Favorecido</th><th>Pagamento</th><th>Valor</th><th>Status</th><th>Recebido</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>`;
  return layout({ title: "Comprovantes", user, active: "/receipt-imports", body, notifications });
}

function receiptImportDetailView({ user, receipt, categories, accounts, values = {}, errors = {}, notifications = [] }) {
  const editable = receipt.status === "NEEDS_REVIEW";
  const form = {
    description: values.description ?? receipt.extracted_description ?? "Despesa importada de comprovante",
    party_name: values.party_name ?? receipt.merchant_name ?? "",
    payment_date: values.payment_date ?? receipt.payment_date ?? "",
    amount: values.amount ?? moneyInput(receipt.amount_cents),
    category_id: values.category_id ?? receipt.suggested_category_id ?? "",
    financial_account_id: values.financial_account_id ?? receipt.suggested_financial_account_id ?? "",
    confirm_duplicate: values.confirm_duplicate ?? "",
  };
  const warnings = parseJsonArray(receipt.warnings_json);
  const confidence = parseJsonObject(receipt.confidence_json);
  const preview = receipt.storage_key && receipt.status !== "REJECTED"
    ? `<figure class="receipt-preview"><img src="/receipt-imports/${escapeHtml(receipt.id)}/media" alt="Imagem do comprovante recebido pelo WhatsApp"></figure>`
    : `<div class="empty-state">A imagem não está disponível.</div>`;
  const duplicateWarning = receipt.duplicate_of_id
    ? `<aside class="receipt-duplicate-warning" aria-labelledby="receipt-duplicate-warning-title">
        <strong id="receipt-duplicate-warning-title">Possível duplicidade</strong>
        <p>Uma imagem idêntica já foi recebida. Compare os dados e revise o comprovante antes de criar a despesa.</p>
      </aside>`
    : "";
  const reviewForm = editable ? `<form method="post" action="/receipt-imports/${escapeHtml(receipt.id)}/approve" class="form-grid receipt-review-form">
      ${csrfInput(user)}
      <label>Descrição
        <input name="description" maxlength="200" required value="${escapeHtml(form.description)}"${fieldErrorAttributes(errors, "description")}>
        ${fieldError(errors, "description")}
      </label>
      <label>Favorecido
        <input name="party_name" maxlength="160" value="${escapeHtml(form.party_name)}">
      </label>
      <label>Data do pagamento
        <input type="date" name="payment_date" required value="${escapeHtml(form.payment_date)}"${fieldErrorAttributes(errors, "payment_date")}>
        ${fieldError(errors, "payment_date")}
      </label>
      <label>Valor pago
        <input name="amount" inputmode="decimal" required value="${escapeHtml(form.amount)}"${fieldErrorAttributes(errors, "amount")}>
        ${fieldError(errors, "amount")}
      </label>
      <label>Categoria
        <select name="category_id">${option("", "Sem categoria", form.category_id)}${categories.map((category) => option(category.id, category.name, form.category_id)).join("")}</select>
        ${fieldError(errors, "category_id")}
      </label>
      <label>Conta usada no pagamento
        <select name="financial_account_id" required${fieldErrorAttributes(errors, "financial_account_id")}>
          ${option("", "Selecione a conta", form.financial_account_id)}
          ${accounts.map((account) => option(account.id, account.name, form.financial_account_id)).join("")}
        </select>
        ${fieldError(errors, "financial_account_id")}
      </label>
      ${receipt.duplicate_of_id ? `<label class="checkbox-field receipt-duplicate-confirm">
        <input type="checkbox" name="confirm_duplicate" value="1"${String(form.confirm_duplicate) === "1" ? " checked" : ""}${fieldErrorAttributes(errors, "confirm_duplicate")}>
        <span>Confirmo que revisei a possível duplicidade e desejo criar a despesa.</span>
        ${fieldError(errors, "confirm_duplicate")}
      </label>` : ""}
      <div class="form-actions">
        <button type="submit" class="primary-button">${buttonContent("Aprovar e criar despesa", "badge-check")}</button>
      </div>
    </form>` : "";
  const alternateActions = ["NEEDS_REVIEW", "FAILED"].includes(receipt.status) ? `<div class="receipt-secondary-actions">
      ${receipt.status === "NEEDS_REVIEW" ? `<form method="post" action="/receipt-imports/${escapeHtml(receipt.id)}/reject">${csrfInput(user)}<button type="submit" class="danger-button">${buttonContent("Rejeitar", "trash-2")}</button></form>` : ""}
      <form method="post" action="/receipt-imports/${escapeHtml(receipt.id)}/reprocess">${csrfInput(user)}<button type="submit" class="ghost-button">${buttonContent("Reprocessar", "refresh-cw")}</button></form>
    </div>` : "";
  const body = `${pageHeading({
    eyebrow: "Comprovante recebido",
    title: receipt.merchant_name || "Conferência do comprovante",
    icon: "scan-text",
    description: `Status: ${STATUS_LABELS[receipt.status] || receipt.status}`,
    actions: buttonLink({ href: "/receipt-imports", label: "Voltar", icon: "arrow-left" }),
  })}
    ${duplicateWarning}
    <div class="receipt-detail-grid">
      <section class="panel">${preview}</section>
      <section class="panel receipt-extraction-summary">
        <h2>Dados extraídos</h2>
        <dl>
          <div><dt>Tipo</dt><dd>${escapeHtml(documentTypeLabel(receipt.document_type))}</dd></div>
          <div><dt>Moeda</dt><dd>${escapeHtml(receipt.currency || "A conferir")}</dd></div>
          <div><dt>Meio de pagamento</dt><dd>${escapeHtml(receipt.payment_method || "A conferir")}</dd></div>
          <div><dt>Referência</dt><dd>${escapeHtml(receipt.transaction_reference || "A conferir")}</dd></div>
          <div><dt>Confiança geral</dt><dd>${confidence.overall === undefined ? "A conferir" : `${Math.round(Number(confidence.overall) * 100)}%`}</dd></div>
        </dl>
        ${warnings.length ? `<div class="receipt-warning-list"><strong>Pontos de atenção</strong><ul>${warnings.map((warning) => `<li><code>${escapeHtml(warning)}</code><small>${escapeHtml(warningExplanation(warning))}</small></li>`).join("")}</ul></div>` : ""}
        ${receipt.status === "FAILED" ? `<div class="notification error">O processamento falhou. Você pode tentar novamente.</div>` : ""}
        ${receipt.financial_entry_id ? `<p>${buttonLink({ href: `/entries/${receipt.financial_entry_id}`, label: "Abrir despesa criada", icon: "external-link" })}</p>` : ""}
      </section>
    </div>
    ${reviewForm}
    ${alternateActions}`;
  return layout({ title: "Conferir comprovante", user, active: "/receipt-imports", body, notifications });
}

function parseJsonArray(value) { try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function parseJsonObject(value) { try { const parsed = JSON.parse(value || "{}"); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }
function warningExplanation(value) {
  const code = String(value || "").trim().toUpperCase();
  return WARNING_EXPLANATIONS[code] || "Aviso gerado durante a leitura automática; revise os dados extraídos.";
}
function formatDateTime(value, timezone) {
  try { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: timezone }).format(new Date(value)); }
  catch { return "-"; }
}
function documentTypeLabel(value) {
  return ({ payment_receipt: "Comprovante de pagamento", scheduled_payment: "Pagamento agendado", bill: "Cobrança", transfer: "Transferência", unreadable: "Documento ilegível", unrelated: "Imagem não financeira" })[value] || "A conferir";
}

module.exports = { receiptImportDetailView, receiptImportsListView };
