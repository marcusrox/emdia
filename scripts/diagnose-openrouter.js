const {
  DEFAULT_RECEIPT_MODEL,
  buildRequest,
  classifyProviderError,
  openRouterEndpoint,
  parseStructuredOutput,
  prepareExtractionOutput,
  validateExtractionSchema,
} = require("../src/services/receiptExtractionService");

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
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PMQ0AMAzAsPInvYLYYVWKESTzjhsd8KsBrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BbQHKU9LC7/CP1AAAAABJRU5ErkJggg==", "base64");
  const body = buildRequest(model, "image/png", image, []);
  const key = String(process.env.OPENROUTER_API_KEY || "").trim();
  console.log(JSON.stringify({
    model: /^[a-zA-Z0-9_./:+-]{1,120}$/.test(model) ? model : "invalid_model_identifier",
    apiKeyConfigured: Boolean(key),
    endpointPathExpected: new URL(endpoint).pathname === "/api/v1/responses",
    store: body.store,
    provider: body.provider,
    outputFormat: body.text.format.type,
    reasoning: body.reasoning || null,
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
      validateExtractionSchema(prepareExtractionOutput(raw, model));
      result.structuredOutput = "json_received";
      result.schemaValidation = "passed";
    } catch {
      result.structuredOutput = "missing_or_invalid";
      process.exitCode = 1;
    }
  } else {
    process.exitCode = 1;
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  diagnose().catch((error) => {
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
