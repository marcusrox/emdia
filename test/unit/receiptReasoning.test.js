const assert = require("node:assert/strict");
const { test } = require("node:test");
require("../helpers/testDatabase");
const { resolveReceiptReasoning } = require("../../src/services/receiptReasoningService");
const { buildRequest, extractReceipt } = require("../../src/services/receiptExtractionService");
const { collectRuntimeEnvironment } = require("../../src/services/runtimeEnvironmentService");
const { diagnose } = require("../../scripts/diagnose-openrouter");

test("reasoning ausente ou vazio preserva o padrão do provedor", () => {
  assert.deepEqual(resolveReceiptReasoning({}), { reasoning: undefined, source: "provider_default" });
  assert.deepEqual(resolveReceiptReasoning({ OPENROUTER_RECEIPT_REASONING: "  " }), {
    reasoning: undefined, source: "provider_default",
  });
});

test("reasoning JSON configura as opções e preserva false", () => {
  for (const reasoning of [
    { enabled: false }, { enabled: true }, { effort: "minimal" }, { effort: "none" },
    { enabled: true, max_tokens: 1000 }, { max_tokens: 1 }, { exclude: true }, { exclude: false },
  ]) {
    const config = resolveReceiptReasoning({
      OPENROUTER_RECEIPT_REASONING: JSON.stringify(reasoning),
    });
    assert.deepEqual(config, { reasoning, source: "json" });
    assert.deepEqual(buildRequest("modelo/ficticio", "image/png", Buffer.from("test"), [], config).reasoning, reasoning);
  }
});

test("reasoning inválido é rejeitado sem incorporar o valor bruto ao erro", () => {
  const invalid = [
    "private-marker", "null", "[]", "{}", '"private-marker"', "false", "42",
    '{"private-marker":true}', '{"enabled":"false"}', '{"exclude":0}',
    '{"effort":"private-marker"}', '{"max_tokens":"1000"}', '{"max_tokens":0}',
    '{"max_tokens":-1}', '{"max_tokens":1.5}', '{"max_tokens":9007199254740992}',
    '{"effort":"low","max_tokens":1000}', '{"enabled":false,"max_tokens":1000}',
    '{"enabled":false,"effort":"none"}', '{"enabled":true,"effort":"none"}',
  ];
  for (const value of invalid) {
    assert.throws(() => resolveReceiptReasoning({ OPENROUTER_RECEIPT_REASONING: value }), (error) => {
      assert.equal(error.code, "OPENROUTER_INVALID_REASONING_CONFIG");
      assert.equal(error.retryable, false);
      assert.equal(error.diagnostics.diagnosticStage, "configuration");
      assert.doesNotMatch(error.message + JSON.stringify(error.diagnostics), /private-marker/);
      return true;
    });
  }
});

test("configuração inválida impede chamadas no diagnóstico e na extração; ambiente mascara o JSON", async (context) => {
  const savedArgv = process.argv;
  const keys = ["OPENROUTER_RECEIPT_REASONING", "OPENROUTER_API_KEY", "OPENROUTER_BASE_URL"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  let calls = 0;
  context.mock.method(global, "fetch", async () => { calls += 1; throw new Error("Não chamar rede"); });
  try {
    process.env.OPENROUTER_RECEIPT_REASONING = '{"private-marker":true}';
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.OPENROUTER_BASE_URL;
    process.argv = ["node", "diagnose-openrouter.js", "--send"];
    await assert.rejects(diagnose(), { code: "OPENROUTER_INVALID_REASONING_CONFIG" });
    await assert.rejects(extractReceipt({}), { code: "OPENROUTER_INVALID_REASONING_CONFIG" });
    assert.equal(calls, 0);
    const variable = collectRuntimeEnvironment().environmentVariables.find((item) => item.name === "OPENROUTER_RECEIPT_REASONING");
    assert.equal(variable.state, "Mascarado");
    assert.equal(variable.value, "—");
  } finally {
    process.argv = savedArgv;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
