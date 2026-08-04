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
    description: "Confira os dados extraídos antes de vincular ou criar a despesa e registrar o pagamento.",
  })}
    <div class="receipt-overview-grid">
      <section class="panel receipt-info-panel" aria-labelledby="receipt-info-title">
        <span class="receipt-info-icon" aria-hidden="true">${lucideIcon("message-circle")}</span>
        <div>
          <h2 id="receipt-info-title">Como funciona o envio pelo WhatsApp</h2>
          <p>Envie uma imagem JPEG ou PNG do comprovante para o WhatsApp do EmDia <a href="https://wa.me/5571996631800" target="_blank" rel="noopener noreferrer">(71) 99663-1800</a>. O sistema identifica o remetente pelo número do telefone, recebe a imagem e extrai automaticamente os principais dados do pagamento usando inteligência artificial.</p>
          <p>Aqui você poderá acompanhar o processamento e conferir os dados extraídos através de IA. Abra o comprovante para conferir as informações, vincular a uma despesa em aberto ou criar uma nova despesa paga. Nenhuma baixa é registrada sem sua aprovação.</p>
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

function receiptImportDetailView({
  user,
  receipt,
  categories,
  accounts,
  matches = [],
  openEntries = [],
  values = {},
  errors = {},
  notifications = [],
}) {
  const editable = receipt.status === "NEEDS_REVIEW";
  const requestedAction = String(values.approval_action || "").toUpperCase();
  const action = ["NEW", "EXISTING"].includes(requestedAction)
    ? requestedAction
    : (matches.length ? "EXISTING" : "NEW");
  const selectedEntryId = values.financial_entry_id ?? matches[0]?.id ?? "";
  const form = {
    description: values.description ?? receipt.extracted_description ?? "Despesa importada de comprovante",
    party_name: values.party_name ?? receipt.merchant_name ?? "",
    payment_date: values.payment_date ?? receipt.payment_date ?? "",
    amount: values.amount ?? moneyInput(receipt.amount_cents),
    category_id: values.category_id ?? receipt.suggested_category_id ?? "",
    financial_account_id: values.financial_account_id ?? receipt.suggested_financial_account_id ?? "",
    confirm_duplicate: values.confirm_duplicate ?? "",
    settlement_completion: values.settlement_completion ?? "PARTIAL",
    confirm_excess: values.confirm_excess ?? "",
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
  const suggestedChoices = matches.length
    ? `<div class="receipt-entry-list">${matches.map((entry, index) => entryChoice(entry, {
        checked: entry.id === selectedEntryId,
        index,
        suggested: true,
      })).join("")}</div>`
    : `<p class="receipt-match-empty">Nenhuma compatibilidade automática encontrada. Você ainda pode escolher outro lançamento em aberto.</p>`;
  const manualChoices = openEntries.length
    ? `<div class="receipt-manual-picker">
        <label>Buscar outro lançamento
          <input type="search" placeholder="Descrição ou favorecido" data-receipt-entry-search>
        </label>
        <div class="receipt-entry-list" data-receipt-entry-list>
          ${openEntries.map((entry, index) => entryChoice(entry, {
            checked: entry.id === selectedEntryId,
            index: matches.length + index,
          })).join("")}
        </div>
        <p class="receipt-entry-search-empty" data-receipt-entry-search-empty hidden>Nenhum lançamento corresponde à busca.</p>
      </div>`
    : `<p class="receipt-match-empty">Não há outros lançamentos em aberto disponíveis.</p>`;
  const canSelectExisting = matches.length > 0 || openEntries.length > 0 || action === "EXISTING";
  const reviewForm = editable ? `<form method="post" action="/receipt-imports/${escapeHtml(receipt.id)}/approve" class="form-grid receipt-review-form" data-receipt-review-form data-validate-form data-disable-on-submit>
      ${csrfInput(user)}
      <fieldset class="receipt-approval-choice wide">
        <legend>Como deseja registrar este comprovante?</legend>
        <div class="receipt-action-options">
          <label class="choice-card">
            <input type="radio" name="approval_action" value="EXISTING"${action === "EXISTING" ? " checked" : ""}${canSelectExisting ? "" : " disabled"}>
            <span>Baixar lançamento existente<small>Vincula o comprovante a uma despesa que já está em aberto.</small></span>
          </label>
          <label class="choice-card">
            <input type="radio" name="approval_action" value="NEW"${action === "NEW" ? " checked" : ""}>
            <span>Criar nova despesa paga<small>Mantém o fluxo atual e cria o lançamento com sua baixa.</small></span>
          </label>
        </div>
        ${fieldError(errors, "approval_action")}
      </fieldset>
      <div class="receipt-payment-fields wide">
        <label>Data do pagamento
          <input type="date" name="payment_date" required value="${escapeHtml(form.payment_date)}"${fieldErrorAttributes(errors, "payment_date")}>
          ${fieldError(errors, "payment_date")}
        </label>
        <label>Valor pago
          <input name="amount" inputmode="decimal" required data-validate-money data-error-message="Informe um valor válido, como 100,00." value="${escapeHtml(form.amount)}"${fieldErrorAttributes(errors, "amount")}>
          ${fieldError(errors, "amount")}
        </label>
        <label>Conta usada no pagamento
          <select name="financial_account_id" required${fieldErrorAttributes(errors, "financial_account_id")}>
            ${option("", "Selecione a conta", form.financial_account_id)}
            ${accounts.map((account) => option(account.id, account.name, form.financial_account_id)).join("")}
          </select>
          ${fieldError(errors, "financial_account_id")}
        </label>
      </div>
      <section class="receipt-mode-panel wide" data-receipt-mode-panel="EXISTING"${action === "EXISTING" ? "" : " hidden"}>
        <div class="receipt-mode-heading">
          <div><span class="receipt-mode-icon" aria-hidden="true">${lucideIcon("link")}</span><h2>Vincular a lançamento existente</h2></div>
          <p>Confira a sugestão ou escolha manualmente uma despesa em aberto de qualquer competência.</p>
        </div>
        ${fieldError(errors, "financial_entry_id")}
        <section class="receipt-match-section" aria-labelledby="receipt-matches-title">
          <h3 id="receipt-matches-title">Compatibilidades encontradas</h3>
          ${suggestedChoices}
        </section>
        <details class="receipt-manual-details"${!matches.length || (selectedEntryId && !matches.some((entry) => entry.id === selectedEntryId)) ? " open" : ""} data-persistent-details>
          <summary>${buttonContent("Selecionar outro lançamento em aberto", "search")}</summary>
          ${manualChoices}
        </details>
        <fieldset class="receipt-settlement-completion" data-receipt-shortfall>
          <legend>Se o valor não quitar todo o saldo</legend>
          <p class="receipt-settlement-projection">Após esta baixa, <strong data-receipt-shortfall-value></strong> permanecerão em aberto.</p>
          <label class="choice-card">
            <input type="radio" name="settlement_completion" value="PARTIAL"${form.settlement_completion !== "FINAL" ? " checked" : ""}${fieldErrorAttributes(errors, "settlement_completion")}>
            <span>Manter saldo em aberto<small>Registra uma baixa parcial.</small></span>
          </label>
          <label class="choice-card">
            <input type="radio" name="settlement_completion" value="FINAL"${form.settlement_completion === "FINAL" ? " checked" : ""}${fieldErrorAttributes(errors, "settlement_completion")}>
            <span>Encerrar o lançamento<small>Confirma que a diferença não será paga.</small></span>
          </label>
          ${fieldError(errors, "settlement_completion")}
        </fieldset>
        <label class="checkbox-field receipt-excess-confirm" data-receipt-excess>
          <input type="checkbox" name="confirm_excess" value="yes"${form.confirm_excess === "yes" ? " checked" : ""}${fieldErrorAttributes(errors, "confirm_excess")}>
          <span data-receipt-excess-message>Confirmo a baixa acima do valor previsto.</span>
          ${fieldError(errors, "confirm_excess")}
        </label>
      </section>
      <section class="receipt-mode-panel wide" data-receipt-mode-panel="NEW"${action === "NEW" ? "" : " hidden"}>
        <div class="receipt-mode-heading">
          <div><span class="receipt-mode-icon" aria-hidden="true">${lucideIcon("file-plus-2")}</span><h2>Dados da nova despesa</h2></div>
          <p>Este é o fluxo atual de criação de uma despesa já paga.</p>
        </div>
        <div class="receipt-new-entry-fields">
          <label>Descrição
            <input name="description" maxlength="200" value="${escapeHtml(form.description)}"${fieldErrorAttributes(errors, "description")}>
            ${fieldError(errors, "description")}
          </label>
          <label>Favorecido
            <input name="party_name" maxlength="160" value="${escapeHtml(form.party_name)}">
          </label>
          <label>Categoria
            <select name="category_id">${option("", "Sem categoria", form.category_id)}${categories.map((category) => option(category.id, category.name, form.category_id)).join("")}</select>
            ${fieldError(errors, "category_id")}
          </label>
        </div>
      </section>
      ${receipt.duplicate_of_id ? `<label class="checkbox-field receipt-duplicate-confirm">
        <input type="checkbox" name="confirm_duplicate" value="1"${String(form.confirm_duplicate) === "1" ? " checked" : ""}${fieldErrorAttributes(errors, "confirm_duplicate")}>
        <span>Confirmo que revisei a possível duplicidade e desejo aprovar o comprovante.</span>
        ${fieldError(errors, "confirm_duplicate")}
      </label>` : ""}
      <div class="form-actions">
        <button type="submit" class="primary-button"><span data-receipt-submit-icon aria-hidden="true">${lucideIcon("badge-check")}</span><span data-receipt-submit-label>${action === "EXISTING" ? "Aprovar e registrar baixa" : "Aprovar e criar despesa"}</span></button>
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
        ${receipt.financial_entry_id ? `<p>${buttonLink({ href: `/entries/${receipt.financial_entry_id}`, label: "Abrir lançamento vinculado", icon: "external-link" })}</p>` : ""}
      </section>
    </div>
    ${reviewForm}
    ${alternateActions}`;
  return layout({ title: "Conferir comprovante", user, active: "/receipt-imports", body, notifications });
}

function entryChoice(entry, { checked = false, index = 0, suggested = false } = {}) {
  const searchText = `${entry.description || ""} ${entry.party_name || ""}`;
  const similarity = Math.round(Number(entry.beneficiary_similarity || 0) * 100);
  return `<label class="receipt-entry-card${suggested ? " receipt-entry-card-suggested" : ""}" data-receipt-entry-card data-search="${escapeHtml(searchText)}">
    <input type="radio" name="financial_entry_id" value="${escapeHtml(entry.id)}" data-entry-expected-cents="${Number(entry.expected_amount_cents || 0)}" data-entry-realized-cents="${Number(entry.realized_amount_cents || 0)}"${checked ? " checked" : ""}>
    <span class="receipt-entry-card-content">
      <span class="receipt-entry-card-heading">
        <strong>${escapeHtml(entry.description || "Sem descrição")}</strong>
        ${suggested && index === 0 ? `<span class="receipt-best-match">${lucideIcon("sparkles")} Mais provável</span>` : ""}
      </span>
      <span class="receipt-entry-card-facts">
        <span><small>Vencimento</small>${escapeHtml(formatCivilDate(entry.due_date, "Sem vencimento"))}</span>
        <span><small>Valor total</small>${escapeHtml(formatMoney(Number(entry.expected_amount_cents || 0)))}</span>
        ${entry.party_name ? `<span><small>Favorecido</small>${escapeHtml(entry.party_name)}</span>` : ""}
        ${suggested ? `<span><small>Semelhança</small>${similarity}%</span>` : ""}
      </span>
    </span>
  </label>`;
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
