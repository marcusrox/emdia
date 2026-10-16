const assert = require("node:assert/strict");
const { test } = require("node:test");
const { crc32, inflateSync } = require("node:zlib");
require("./helpers/testDatabase");
const { buildRequest, classifyProviderError, parseStructuredOutput, prepareExtractionOutput, validateExtraction, validateExtractionSchema } = require("../src/services/receiptExtractionService");
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

test("modelos distintos recebem o mesmo JSON mode, contrato e política de privacidade", () => {
  const request = buildRequest("qwen/qwen3.7-flash", "image/png", Buffer.from("synthetic"), []);
  assert.deepEqual(request.text.format, { type: "json_object" });
  assert.match(request.input[0].content[0].text, /objeto JSON válido/);
  assert.match(request.input[0].content[0].text, /"amount_cents":\{"type":\["integer","null"\]/);
  assert.equal(request.provider.require_parameters, true);
  assert.equal(request.provider.data_collection, "deny");
  assert.equal(request.store, false);
  for (const model of ["openai/gpt-5-mini", "google/gemini-2.5-flash-lite", "fabricante/modelo-ficticio"]) {
    assert.deepEqual(buildRequest(model, "image/png", Buffer.from("synthetic"), []), { ...request, model });
  }
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

test("extração normaliza somente avisos e mantém o contrato financeiro estrito", () => {
  for (const source of [null, undefined, "revisar_dados", ["x".repeat(100)], Array.from({ length: 14 }, (_, index) => `aviso_${index}`), ["", "aviso", "aviso"]]) {
    const raw = { ...validExtraction(), warnings: source };
    const prepared = prepareExtractionOutput(raw);
    assert.ok(prepared.warnings.includes("warnings_normalized"));
    assert.ok(prepared.warnings.length <= 12);
    assert.ok(prepared.warnings.every((item) => typeof item === "string" && item.length <= 60));
    assert.equal(raw.warnings, source);
    validateExtractionSchema(prepared);
  }
  assert.deepEqual(prepareExtractionOutput({ ...validExtraction(), warnings: [] }).warnings, []);
  for (const warnings of [{ text: "private-marker" }, 123, [null], ["aviso", { text: "private-marker" }]]) {
    assert.throws(() => prepareExtractionOutput({ ...validExtraction(), warnings }), (error) => {
      const details = safeExtractionDiagnostics(error);
      assert.equal(details.validationField, "receipt.warnings");
      assert.equal(details.validationRule, "type");
      assert.ok(details.actualType);
      assert.doesNotMatch(JSON.stringify(details), /private-marker/);
      return true;
    });
  }
  assert.throws(() => prepareExtractionOutput({ ...validExtraction(), warnings: null, amount_cents: "1234" }), (error) => {
    assert.equal(error.diagnostics.validationField, "receipt.amount_cents");
    return true;
  });
});

test("respostas incompletas, recusadas e JSON inválido são rejeitados sem expor conteúdo", () => {
  for (const [payload, reason] of [
    [{ status: "incomplete", output_text: JSON.stringify(validExtraction()) }, "incomplete_output"],
    [{ output: [{ status: "incomplete", content: [{ type: "output_text", text: JSON.stringify(validExtraction()) }] }] }, "incomplete_output"],
    [{ output_text: "private-marker" }, "output_text_not_json"],
    [{ output: [{ content: [{ type: "refusal", refusal: "private-marker" }] }] }, "model_refusal"],
  ]) {
    assert.throws(() => parseStructuredOutput(payload), (error) => {
      assert.equal(error.diagnostics.reason, reason);
      assert.doesNotMatch(JSON.stringify(error.diagnostics), /private-marker/);
      return true;
    });
  }
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
  const keys = ["OPENROUTER_API_KEY", "OPENROUTER_BASE_URL", "OPENROUTER_RECEIPT_REASONING"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const output = [];
  let calls = 0;
  try {
    process.env.OPENROUTER_API_KEY = "test-secret-never-print";
    process.env.OPENROUTER_RECEIPT_REASONING = '{"enabled":false}';
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
      assert.deepEqual(body.reasoning, { enabled: false });
      const png = Buffer.from(body.input[0].content[1].image_url.split(",")[1], "base64");
      assert.equal(png.readUInt32BE(16), 64);
      assert.equal(png.readUInt32BE(20), 64);
      for (let offset = 8; offset < png.length;) {
        const length = png.readUInt32BE(offset);
        assert.equal(crc32(png.subarray(offset + 4, offset + 8 + length)), png.readUInt32BE(offset + 8 + length));
        if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") {
          assert.equal(inflateSync(png.subarray(offset + 8, offset + 8 + length)).length, 64 * 193);
        }
        offset += length + 12;
      }
      return {
        ok: false, status: 404,
        json: async () => ({ error: { message: "No endpoints found matching your data policy: private-marker" } }),
      };
    };
    process.argv = ["node", "diagnose-openrouter.js", "--model", "qwen/qwen3.7-flash"];
    await diagnose();
    assert.equal(calls, 0);
    assert.equal(JSON.parse(output.at(-1)).reasoningSource, "json");
    process.argv.push("--send");
    await diagnose();
    assert.equal(calls, 1);
    assert.equal(JSON.parse(output.at(-1)).reason, "data_policy");
    assert.equal(process.exitCode, 1);
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({
      output_text: JSON.stringify({ ...validExtraction(), confidence: null, merchant_name: "private-marker" }),
    }) });
    await diagnose();
    const failedSchema = JSON.parse(output.at(-1));
    assert.equal(failedSchema.diagnosticStage, "schema_validation");
    assert.equal(failedSchema.validationField, "receipt.confidence");
    assert.equal(failedSchema.actualType, "null");
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ output_text: JSON.stringify(validExtraction()) }) });
    process.exitCode = undefined;
    await diagnose();
    assert.equal(JSON.parse(output.at(-1)).schemaValidation, "passed");
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
