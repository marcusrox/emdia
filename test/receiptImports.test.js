const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { beforeEach, test } = require("node:test");
const request = require("supertest");
const ReceiptImport = require("../src/models/ReceiptImport");
const User = require("../src/models/User");
const { createServer } = require("../src/server");
const {
  buildRequest,
  extractionSchema,
  openRouterEndpoint,
  parseStructuredOutput,
} = require("../src/services/receiptExtractionService");
const { processReceipt, safeExtractionDiagnostics } = require("../src/services/receiptImportWorker");
const { normalizeEvent } = require("../src/services/operationalLogger");
const { detectImage, validateMediaUrl } = require("../src/services/receiptStorageService");
const { receiptImportDetailView } = require("../src/views/receiptImportsView");
const {
  acceptWebhook,
  directPhoneFromChatId,
  verifyWebhook,
  webhookLogDetails,
} = require("../src/services/wahaReceiptWebhookService");
const { createFinancialFixture, createUser, db, resetDatabase } = require("./helpers/testDatabase");

beforeEach(() => {
  resetDatabase();
  process.env.WAHA_SESSION = "default";
  process.env.WAHA_API_BASE_URL = "https://waha.example.test";
  process.env.WAHA_API_KEY = "test-api-key";
  process.env.WAHA_WEBHOOK_HMAC_KEY = "test-hmac-key";
  process.env.WAHA_WEBHOOK_MAX_AGE_SECONDS = "300";
  process.env.RECEIPT_WORKER_DISABLED = "1";
  delete process.env.OPENROUTER_BASE_URL;
});

test("webhook WAHA autenticado cria uma única importação para telefone ativo", async () => {
  const user = createUser({ phoneE164: "+5511999999999" });
  const raw = webhookBody();
  const headers = signedHeaders(raw);

  const first = await acceptWebhook(raw, headers);
  const second = await acceptWebhook(raw, headers);

  assert.equal(first.created, true);
  assert.equal(first.userId, user.id);
  assert.equal(first.logDetails.senderPhoneE164, undefined);
  assert.equal(first.logDetails.userMatchStrategy, "exact");
  assert.equal(second.duplicate, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM receipt_imports").get().total, 1);
});

test("webhook recusa assinatura inválida e timestamp fora da janela", () => {
  const raw = webhookBody();
  const validHeaders = signedHeaders(raw);
  assert.equal(verifyWebhook(raw, { ...validHeaders, "x-webhook-hmac": "00" }).status, 403);
  assert.equal(verifyWebhook(raw, { ...validHeaders, "x-webhook-timestamp": String(Date.now() - 600000) }).reason, "replay_rejected");
});

test("metadados do webhook enriquecem diagnóstico sem expor remetente ou mídia", async () => {
  const raw = webhookBody();
  const event = JSON.parse(raw.toString("utf8"));
  event.engine = "WEBJS";
  const details = webhookLogDetails(event);
  const result = await acceptWebhook(raw, signedHeaders(raw));
  const safeMetadata = JSON.stringify(details);

  assert.equal(details.stage, "validated");
  assert.equal(details.event, "message");
  assert.equal(details.wahaInstance, "default");
  assert.equal(details.engine, "WEBJS");
  assert.equal(details.providerEventRef, "event-1");
  assert.equal(details.providerMessageRef, "message-1");
  assert.equal(details.senderType, "individual");
  assert.match(details.senderRef, /^hmac:[a-f0-9]{16}$/);
  assert.equal(details.hasMedia, true);
  assert.equal(details.mediaMime, "image/jpeg");
  assert.equal(result.reason, "user_not_found");
  assert.equal(result.logDetails.stage, "user_lookup");
  assert.equal(result.logDetails.senderPhoneE164, "+5511999999999");
  assert.doesNotMatch(safeMetadata, /5511999999999/);
  assert.doesNotMatch(safeMetadata, /receipt\.jpg/);
  assert.doesNotMatch(safeMetadata, /test-hmac-key/);

  const logDetails = { ...result.logDetails, reason: result.reason };
  const defaultLog = normalizeEvent({ event: "whatsapp.webhook.ignored", details: logDetails });
  const diagnosticLog = normalizeEvent({
    event: "whatsapp.webhook.ignored",
    allowWebhookSenderE164: true,
    details: logDetails,
  });
  const wrongReasonLog = normalizeEvent({
    event: "whatsapp.webhook.ignored",
    allowWebhookSenderE164: true,
    details: { ...logDetails, reason: "sender_unresolved" },
  });
  assert.equal(defaultLog.details.senderPhoneE164, "[redacted]");
  assert.equal(diagnosticLog.details.senderPhoneE164, "+5511999999999");
  assert.equal(wrongReasonLog.details.senderPhoneE164, "[redacted]");
});

test("normalização aceita somente chats individuais documentados", () => {
  assert.equal(directPhoneFromChatId("5511999999999@c.us"), "+5511999999999");
  assert.equal(directPhoneFromChatId("5511999999999@s.whatsapp.net"), "+5511999999999");
  assert.equal(directPhoneFromChatId("5511999999999@g.us"), null);
  assert.equal(directPhoneFromChatId("abc@c.us"), null);
});

test("telefone identifica usuário ativo por igualdade E.164 e permanece único", () => {
  const user = createUser({ phoneE164: "+5571999999999" });
  assert.equal(User.findActiveByPhoneE164("+5571999999999").id, user.id);
  assert.throws(() => createUser({ phoneE164: "+5571999999999" }), /UNIQUE constraint failed/);
});

test("webhook reconhece celular brasileiro pelo formato legado sem consultar o WAHA", async () => {
  const user = createUser({ phoneE164: "+5571992769969" });
  const raw = webhookBody({ from: "557192769969@c.us", messageId: "message-legacy" });

  const result = await acceptWebhook(raw, signedHeaders(raw));

  assert.equal(user.phone_whatsapp_legacy, "+557192769969");
  assert.equal(result.created, true);
  assert.equal(result.userId, user.id);
  assert.equal(result.logDetails.userMatchStrategy, "legacy_alias");
});

test("alias legado só é gerado para celular brasileiro no formato atual", () => {
  assert.equal(User.legacyWhatsAppPhone("+5571992769969"), "+557192769969");
  assert.equal(User.legacyWhatsAppPhone("+557132456789"), "");
  assert.equal(User.legacyWhatsAppPhone("+351912345678"), "");
});

test("aprovação cria despesa paga e baixa dentro do vínculo da importação", () => {
  const { user, accountId, categoryId } = createFinancialFixture();
  const receipt = createReceipt(user.id);
  db.prepare(`
    UPDATE receipt_imports
    SET status = 'NEEDS_REVIEW', merchant_name = 'Mercado Teste', payment_date = '2026-07-30', amount_cents = 12345
    WHERE id = ?
  `).run(receipt.id);

  const result = ReceiptImport.approve(user, receipt.id, {
    description: "Compra no mercado",
    party_name: "Mercado Teste",
    payment_date: "2026-07-30",
    amount: "123,45",
    category_id: categoryId,
    financial_account_id: accountId,
  });

  assert.equal(result.ok, true);
  const entry = db.prepare("SELECT * FROM financial_entries WHERE id = ?").get(result.entryId);
  const settlement = db.prepare("SELECT * FROM settlements WHERE financial_entry_id = ?").get(result.entryId);
  const imported = ReceiptImport.getById(receipt.id);
  assert.equal(entry.origin, "WHATSAPP_RECEIPT");
  assert.equal(entry.status, "PAID");
  assert.equal(entry.competence_month, "2026-07");
  assert.equal(entry.expected_amount_cents, 12345);
  assert.equal(entry.realized_amount_cents, 12345);
  assert.equal(settlement.total_cents, 12345);
  assert.equal(settlement.closes_entry, 1);
  assert.equal(imported.status, "APPROVED");
  assert.equal(imported.financial_entry_id, result.entryId);
});

test("possível duplicidade exige confirmação humana", () => {
  const { user, accountId } = createFinancialFixture();
  const original = createReceipt(user.id, "message-original");
  const duplicate = createReceipt(user.id, "message-duplicate");
  db.prepare(`UPDATE receipt_imports SET status = 'NEEDS_REVIEW', duplicate_of_id = ?, payment_date = '2026-07-30', amount_cents = 100 WHERE id = ?`)
    .run(original.id, duplicate.id);
  const result = ReceiptImport.approve(user, duplicate.id, {
    description: "Teste",
    payment_date: "2026-07-30",
    amount: "1,00",
    financial_account_id: accountId,
  });
  assert.equal(result.reason, "validation");
  assert.ok(result.errors.confirm_duplicate);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM financial_entries").get().total, 0);
});

test("possível duplicidade usa alerta e confirmação com marcação própria", () => {
  const html = receiptImportDetailView({
    user: {
      id: "usr_view",
      name: "Usuário",
      email: "user@example.test",
      timezone: "America/Sao_Paulo",
      csrfToken: "csrf-test",
    },
    receipt: {
      id: "rcp_view",
      status: "NEEDS_REVIEW",
      duplicate_of_id: "rcp_original",
      merchant_name: "Mercado",
      amount_cents: 1000,
      confidence_json: "{}",
      warnings_json: "[]",
    },
    categories: [],
    accounts: [],
    errors: { confirm_duplicate: "Confirme a revisão da possível duplicidade." },
  });

  assert.match(html, /class="receipt-duplicate-warning"/);
  assert.match(html, /class="checkbox-field receipt-duplicate-confirm"/);
  assert.match(html, /aria-describedby="confirm_duplicate-error"/);
  assert.match(html, /<span>Confirmo que revisei a possível duplicidade/);
  assert.doesNotMatch(html, /class="notification warning"/);
});

test("pontos de atenção explicam códigos conhecidos e desconhecidos", () => {
  const html = receiptImportDetailView({
    user: {
      id: "usr_view",
      name: "Usuário",
      email: "user@example.test",
      timezone: "America/Sao_Paulo",
      csrfToken: "csrf-test",
    },
    receipt: {
      id: "rcp_warnings",
      status: "NEEDS_REVIEW",
      confidence_json: "{}",
      warnings_json: JSON.stringify(["PMETH_INFERRED", "CATEGORY_LOW_CONFIDENCE", "TRANS_REF_PARTIAL", "NEW_WARNING"]),
    },
    categories: [],
    accounts: [],
  });

  assert.match(html, /PMETH_INFERRED<\/code><small>O meio de pagamento foi deduzido/);
  assert.match(html, /CATEGORY_LOW_CONFIDENCE<\/code><small>A categoria sugerida tem baixa confiança/);
  assert.match(html, /TRANS_REF_PARTIAL<\/code><small>A referência da transação foi identificada apenas parcialmente/);
  assert.match(html, /NEW_WARNING<\/code><small>Aviso gerado durante a leitura automática/);
});

test("worker usa mocks, detecta hash e leva importação à revisão", async () => {
  const user = createUser();
  const receipt = createReceipt(user.id);
  const claimed = ReceiptImport.claimNext();
  await processReceipt(claimed, {
    downloadReceiptMedia: async () => ({ storageKey: `${receipt.id}-abcdef123456.jpg`, mimeType: "image/jpeg", sizeBytes: 3, sha256: "abc" }),
    extractReceipt: async () => ({
      documentType: "payment_receipt", merchantName: "Loja", paymentDate: "2026-07-30", amountCents: 500,
      currency: "BRL", paymentMethod: "PIX", transactionReference: null, suggestedCategoryName: null,
      suggestedCategoryId: null, description: "Pagamento a Loja", confidence: { overall: 0.9 }, warnings: [], raw: {},
      responseId: "resp_test", model: "gpt-test", usage: { totalTokens: 10 }, durationMs: 5,
    }),
  });
  assert.equal(ReceiptImport.getById(receipt.id).status, "NEEDS_REVIEW");
});

test("requisição OpenRouter desabilita armazenamento e exige schema estruturado", () => {
  const requestBody = buildRequest("gpt-test", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff]), []);
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.provider.zdr, undefined);
  assert.equal(requestBody.provider.data_collection, "deny");
  assert.equal(requestBody.provider.require_parameters, true);
  assert.equal(requestBody.max_output_tokens, 4000);
  assert.equal(requestBody.reasoning, undefined);
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(requestBody.text.format.schema.additionalProperties, false);
  assert.equal(requestBody.input[0].content[1].detail, "high");
  assert.equal(extractionSchema().properties.amount_cents.type[0], "integer");
  assert.equal(openRouterEndpoint(), "https://openrouter.ai/api/v1/responses");
});

test("requisição OpenRouter inclui reasoning somente quando configurado", () => {
  const previousEffort = process.env.OPENROUTER_RECEIPT_REASONING_EFFORT;

  try {
    process.env.OPENROUTER_RECEIPT_REASONING_EFFORT = "minimal";
    const configured = buildRequest("openai/gpt-5-mini", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff]), []);
    assert.deepEqual(configured.reasoning, { effort: "minimal" });

    process.env.OPENROUTER_RECEIPT_REASONING_EFFORT = "não-suportado";
    const invalid = buildRequest("gpt-test", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff]), []);
    assert.equal(invalid.reasoning, undefined);
  } finally {
    if (previousEffort === undefined) delete process.env.OPENROUTER_RECEIPT_REASONING_EFFORT;
    else process.env.OPENROUTER_RECEIPT_REASONING_EFFORT = previousEffort;
  }
});

test("resposta OpenRouter inválida informa a etapa sem registrar conteúdo do modelo", () => {
  const payload = {
    id: "resp_diagnostic",
    status: "completed",
    output: [{ type: "message", content: [{ type: "reasoning", text: "conteúdo sensível" }] }],
  };

  assert.throws(
    () => parseStructuredOutput(payload, { httpStatus: 200, responseContentType: "application/json" }),
    (error) => {
      assert.equal(error.code, "OPENROUTER_INVALID_RESPONSE");
      assert.equal(error.diagnostics.diagnosticStage, "structured_output");
      assert.equal(error.diagnostics.reason, "output_text_missing");
      assert.equal(error.diagnostics.responseId, "resp_diagnostic");
      assert.deepEqual(error.diagnostics.outputTypes, ["message"]);
      assert.deepEqual(error.diagnostics.contentTypes, ["reasoning"]);
      assert.doesNotMatch(JSON.stringify(error.diagnostics), /conteúdo sensível/);
      return true;
    }
  );
});

test("worker permite somente metadados seguros no diagnóstico da extração", () => {
  const details = safeExtractionDiagnostics({
    diagnostics: {
      diagnosticStage: "structured_output",
      reason: "output_text_not_json",
      httpStatus: 200,
      responseContentType: "application/json; charset=utf-8",
      outputTextLength: 321,
      model: "openai/gpt-5-mini",
      outputTypes: ["message"],
      payload: "não registrar",
      secret: "não registrar",
    },
  });

  assert.equal(details.reason, "output_text_not_json");
  assert.equal(details.httpStatus, 200);
  assert.equal(details.outputTextLength, 321);
  assert.equal(details.model, "openai/gpt-5-mini");
  assert.equal(details.payload, undefined);
  assert.equal(details.secret, undefined);
});

test("mídia bloqueia outra origem e reconhece assinatura real", () => {
  assert.throws(() => validateMediaUrl("https://evil.example.test/file.jpg"), /INVALID_MEDIA_URL/);
  assert.equal(validateMediaUrl("https://waha.example.test/api/files/test.jpg"), "https://waha.example.test/api/files/test.jpg");
  assert.equal(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0x00])).mimeType, "image/jpeg");
  assert.equal(detectImage(Buffer.from("not-an-image")), null);
});

test("rota pública do webhook preserva corpo bruto e responde antes do worker", async () => {
  const app = createServer({
    whatsappWebhook: {
      acceptWebhook: async (rawBody) => ({ ok: true, created: true, receiptId: `rcp_${rawBody.length}`, userId: "usr_test" }),
    },
  });
  const response = await request(app)
    .post("/webhooks/whatsapp/waha")
    .set("Content-Type", "application/json")
    .send({ event: "message" });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});

function createReceipt(userId, providerMessageId = `msg-${crypto.randomUUID()}`) {
  return ReceiptImport.createFromWebhook({
    user_id: userId,
    provider_message_id: providerMessageId,
    provider_media_url: "https://waha.example.test/api/files/receipt.jpg",
    source_chat_id: "5511999999999@c.us",
    sender_phone_e164: "+5511999999999",
  }).receipt;
}

function webhookBody({ from = "5511999999999@c.us", messageId = "message-1" } = {}) {
  return Buffer.from(JSON.stringify({
    id: "event-1",
    event: "message",
    session: "default",
    payload: {
      id: messageId,
      from,
      fromMe: false,
      hasMedia: true,
      timestamp: 1785456000,
      media: { url: "https://waha.example.test/api/files/receipt.jpg", mimetype: "image/jpeg", filename: "receipt.jpg" },
    },
  }));
}

function signedHeaders(raw) {
  return {
    "x-webhook-request-id": "request-test",
    "x-webhook-timestamp": String(Date.now()),
    "x-webhook-hmac-algorithm": "sha512",
    "x-webhook-hmac": crypto.createHmac("sha512", process.env.WAHA_WEBHOOK_HMAC_KEY).update(raw).digest("hex"),
  };
}
