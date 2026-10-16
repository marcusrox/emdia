const EFFORTS = new Set(["none", "minimal", "low", "medium", "high", "xhigh", "max"]);
const FIELDS = new Set(["enabled", "effort", "max_tokens", "exclude"]);

function resolveReceiptReasoning(env = process.env) {
  const source = String(env.OPENROUTER_RECEIPT_REASONING || "").trim();
  if (!source) return { reasoning: undefined, source: "provider_default" };

  function invalid(rule) {
    const error = new Error("Configuração OPENROUTER_RECEIPT_REASONING inválida. Confira o formato JSON e as opções de raciocínio.");
    error.code = "OPENROUTER_INVALID_REASONING_CONFIG";
    error.retryable = false;
    error.diagnostics = {
      diagnosticStage: "configuration", reason: "invalid_reasoning_configuration",
      validationField: "reasoning", validationRule: rule,
    };
    throw error;
  }

  let parsed;
  try { parsed = JSON.parse(source); } catch { invalid("json"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) invalid("object");
  const keys = Object.keys(parsed);
  if (!keys.length) invalid("empty_object");
  if (keys.some((key) => !FIELDS.has(key))) invalid("unknown_property");
  for (const key of ["enabled", "exclude"]) {
    if (Object.hasOwn(parsed, key) && typeof parsed[key] !== "boolean") invalid("boolean");
  }
  if (Object.hasOwn(parsed, "effort") && !EFFORTS.has(parsed.effort)) invalid("effort");
  if (Object.hasOwn(parsed, "max_tokens") && (!Number.isSafeInteger(parsed.max_tokens) || parsed.max_tokens <= 0)) invalid("max_tokens");
  if (Object.hasOwn(parsed, "effort") && Object.hasOwn(parsed, "max_tokens")) invalid("conflicting_budget");
  if (parsed.enabled === false && (Object.hasOwn(parsed, "effort") || Object.hasOwn(parsed, "max_tokens"))) invalid("disabled_budget");
  if (parsed.enabled === true && parsed.effort === "none") invalid("enabled_none");

  return { reasoning: Object.fromEntries(keys.map((key) => [key, parsed[key]])), source: "json" };
}

module.exports = { resolveReceiptReasoning };
