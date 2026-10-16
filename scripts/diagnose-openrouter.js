const {
  DEFAULT_RECEIPT_MODEL,
  buildRequest,
  classifyProviderError,
  openRouterEndpoint,
  parseStructuredOutput,
  prepareExtractionOutput,
} = require("../src/services/receiptExtractionService");
const { resolveReceiptReasoning } = require("../src/services/receiptReasoningService");
const { safeExtractionDiagnostics } = require("../src/services/receiptImportWorker");
const { crc32, deflateSync } = require("node:zlib");

function syntheticReceiptImage() {
  function chunk(type, data) {
    const buffer = Buffer.alloc(data.length + 12);
    buffer.writeUInt32BE(data.length);
    buffer.write(type, 4);
    data.copy(buffer, 8);
    buffer.writeUInt32BE(crc32(buffer.subarray(4, -4)), buffer.length - 4);
    return buffer;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(64);
  header.writeUInt32BE(64, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.alloc(64 * 193, 255);
  for (let row = 0; row < 64; row += 1) pixels[row * 193] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function diagnose() {
  const args = process.argv.slice(2);
  const modelIndex = args.indexOf("--model");
  if (args.some((arg, index) => !["--send", "--model"].includes(arg) && !(modelIndex !== -1 && index === modelIndex + 1))
    || (modelIndex !== -1 && (!args[modelIndex + 1] || args[modelIndex + 1].startsWith("--")))) {
    throw new Error("Uso: node scripts/diagnose-openrouter.js [--model identificador] [--send]");
  }
  const model = modelIndex === -1
    ? String(process.env.OPENROUTER_RECEIPT_MODEL || DEFAULT_RECEIPT_MODEL).trim()
    : args[modelIndex + 1];
  const endpoint = openRouterEndpoint();
  // PNG branco de 64x64: evita limites mínimos de imagem dos provedores.
  const image = syntheticReceiptImage();
  const reasoningConfig = resolveReceiptReasoning();
  const body = buildRequest(model, "image/png", image, [], reasoningConfig);
  const key = String(process.env.OPENROUTER_API_KEY || "").trim();
  console.log(JSON.stringify({
    model: /^[a-zA-Z0-9_./:+-]{1,120}$/.test(model) ? model : "invalid_model_identifier",
    apiKeyConfigured: Boolean(key),
    endpointPathExpected: new URL(endpoint).pathname === "/api/v1/responses",
    store: body.store,
    provider: body.provider,
    outputFormat: body.text.format.type,
    reasoning: body.reasoning || null,
    reasoningSource: reasoningConfig.source,
    maxOutputTokens: body.max_output_tokens,
    input: "synthetic_png",
    send: args.includes("--send"),
  }, null, 2));
  if (!args.includes("--send")) return;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada no ambiente do processo.");
  const configuredTimeout = Number(process.env.OPENROUTER_REQUEST_TIMEOUT_MS || 30000);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 30000;
  const startedAt = Date.now();
  let response;
  let payload;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    payload = await response.json();
  } catch {
    console.log(JSON.stringify({ stage: response ? "response_decode" : "request", reason: "network_timeout_or_invalid_response" }));
    process.exitCode = 1;
    return;
  }
  const failed = !response.ok || Boolean(payload?.error) || payload?.status === "failed";
  const result = {
    httpStatus: response.status,
    durationMs: Date.now() - startedAt,
    reason: failed ? classifyProviderError(payload) : "api_accepted",
  };
  if (!failed) {
    try {
      const raw = parseStructuredOutput(payload);
      prepareExtractionOutput(raw);
      result.structuredOutput = "json_received";
      result.schemaValidation = "passed";
    } catch (error) {
      result.structuredOutput = "missing_or_invalid";
      Object.assign(result, safeExtractionDiagnostics(error));
      process.exitCode = 1;
    }
  } else {
    process.exitCode = 1;
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  diagnose().catch((error) => {
    if (error.code === "OPENROUTER_INVALID_REASONING_CONFIG") {
      console.error(JSON.stringify({ code: error.code, message: error.message, ...safeExtractionDiagnostics(error) }));
      process.exitCode = 1;
      return;
    }
    // Erros esperados locais têm mensagem fixa; erros externos nunca são impressos.
    const safeMessages = new Set([
      "Uso: node scripts/diagnose-openrouter.js [--model identificador] [--send]",
      "OPENROUTER_API_KEY não configurada no ambiente do processo.",
      "OPENROUTER_INVALID_BASE_URL",
    ]);
    console.error(safeMessages.has(error.message) ? error.message : "Falha no diagnóstico OpenRouter.");
    process.exitCode = 1;
  });
}

module.exports = { diagnose };
