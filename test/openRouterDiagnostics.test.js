const assert = require("node:assert/strict");
const { test } = require("node:test");
require("./helpers/testDatabase");
const { buildRequest, classifyProviderError, validateExtraction, validateExtractionSchema } = require("../src/services/receiptExtractionService");
const { safeExtractionDiagnostics } = require("../src/services/receiptImportWorker");
const { diagnose } = require("../scripts/diagnose-openrouter");

function validExtraction() {
  return {
    document_type: "unreadable", merchant_name: null, payment_date: null,
    amount_cents: null, currency: null, payment_method: null,
    transaction_reference: null, suggested_category_name: null,
    confidence: { document_type: 0, merchant_name: 0, payment_date: 0, amount_cents: 0, category: 0, overall: 0 },
    warnings: ["unreadable_image"],
  };
}

test("Qwen 3.7 usa JSON mode com contrato no prompt e preserva privacidade", () => {
  const request = buildRequest("qwen/qwen3.7-flash", "image/png", Buffer.from("synthetic"), []);
  assert.deepEqual(request.text.format, { type: "json_object" });
  assert.match(request.input[0].content[0].text, /objeto JSON válido/);
  assert.match(request.input[0].content[0].text, /"amount_cents":\{"type":\["integer","null"\]/);
  assert.equal(request.provider.require_parameters, true);
  assert.equal(request.provider.data_collection, "deny");
  assert.equal(request.store, false);
  assert.equal(buildRequest("openai/gpt-5-mini", "image/png", Buffer.from("x"), []).text.format.type, "json_schema");
});

test("validação local bloqueia JSON fora do contrato sem coerção financeira", () => {
  assert.doesNotThrow(() => validateExtractionSchema(validExtraction()));
  const mutations = [
    (raw) => { delete raw.amount_cents; },
    (raw) => { raw.amount_cents = "1200"; },
    (raw) => { raw.amount_cents = 12.5; },
    (raw) => { raw.amount_cents = Number.MAX_SAFE_INTEGER + 1; },
    (raw) => { raw.amount_cents = 0; },
    (raw) => { raw.confidence.overall = null; },
    (raw) => { raw.confidence.overall = 1.1; },
    (raw) => { raw.confidence.extra = "private-marker"; },
    (raw) => { raw.currency = "invalid"; },
    (raw) => { raw.warnings = ["x".repeat(61)]; },
    (raw) => { raw.merchant_name = "x".repeat(161); },
    (raw) => { raw["private-marker"] = true; },
  ];
  for (const mutate of mutations) {
    const raw = validExtraction();
    mutate(raw);
    assert.throws(() => validateExtractionSchema(raw), (error) => {
      assert.equal(error.code, "OPENROUTER_INVALID_RESPONSE");
      assert.equal(error.diagnostics.diagnosticStage, "schema_validation");
      assert.doesNotMatch(JSON.stringify(error.diagnostics), /private-marker/);
      return true;
    });
  }
  const raw = validExtraction();
  Object.assign(raw, { document_type: "payment_receipt", amount_cents: 1250, currency: "BRL", payment_method: "PIX" });
  validateExtractionSchema(raw);
  assert.equal(validateExtraction(raw, [], "test-user").amountCents, 1250);
});

test("diagnóstico distingue causas de HTTP 404 sem expor mensagens do provedor", () => {
  const cases = [
    ["No endpoints found matching your data policy", "data_policy"],
    ["No endpoints found that support the requested parameters", "unsupported_parameters"],
    ["No endpoints found", "no_matching_endpoints"],
    ["Model does not exist", "model_unavailable"],
    ["Not found", "resource_not_found"],
    ["conteúdo financeiro privado", "unclassified"],
  ];
  for (const [message, expected] of cases) {
    const providerErrorReason = classifyProviderError({ error: { message } });
    assert.equal(providerErrorReason, expected);
    const details = safeExtractionDiagnostics({ diagnostics: { providerErrorReason, message } });
    assert.deepEqual(details, { providerErrorReason: expected });
    assert.ok(!JSON.stringify(details).includes(message));
  }
  assert.equal(classifyProviderError(null), "unclassified");
});

test("script só envia com --send e mantém credenciais e resposta livre fora da saída", async () => {
  const originalArgv = process.argv;
  const originalFetch = global.fetch;
  const originalLog = console.log;
  const originalExitCode = process.exitCode;
  const keys = ["OPENROUTER_API_KEY", "OPENROUTER_BASE_URL"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const output = [];
  let calls = 0;
  try {
    process.env.OPENROUTER_API_KEY = "test-secret-never-print";
    delete process.env.OPENROUTER_BASE_URL;
    console.log = (value) => output.push(value);
    global.fetch = async (endpoint, options) => {
      calls += 1;
      assert.equal(endpoint, "https://openrouter.ai/api/v1/responses");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "qwen/qwen3.7-flash");
      assert.deepEqual(body.provider, { require_parameters: true, data_collection: "deny" });
      assert.equal(body.store, false);
      assert.equal(body.text.format.type, "json_object");
      return {
        ok: false, status: 404,
        json: async () => ({ error: { message: "No endpoints found matching your data policy: private-marker" } }),
      };
    };
    process.argv = ["node", "diagnose-openrouter.js", "--model", "qwen/qwen3.7-flash"];
    await diagnose();
    assert.equal(calls, 0);
    process.argv.push("--send");
    await diagnose();
    assert.equal(calls, 1);
    assert.equal(JSON.parse(output.at(-1)).reason, "data_policy");
    assert.equal(process.exitCode, 1);
    assert.doesNotMatch(output.join("\n"), /test-secret-never-print|private-marker/);
  } finally {
    process.argv = originalArgv;
    global.fetch = originalFetch;
    console.log = originalLog;
    process.exitCode = originalExitCode;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
