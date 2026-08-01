const { createHash } = require("node:crypto");

const DEFAULT_RESEND_BASE_URL = "https://api.resend.com";
const DEFAULT_EMAIL_FROM = "EmDia <nao-responda@idevs.com.br>";

class EmailProviderError extends Error {
  constructor(code, options = {}) {
    super(options.message || "Falha controlada no provedor de e-mail.");
    this.name = "EmailProviderError";
    this.code = code;
    this.statusCode = options.statusCode || null;
    this.transient = Boolean(options.transient);
  }
}

class MockEmailClient {
  constructor() {
    this.provider = "mock";
  }

  async send(message) {
    validateMessage(message);
    const fingerprint = createHash("sha256")
      .update(String(message.idempotencyKey || message.to))
      .digest("hex")
      .slice(0, 16);
    return { providerMessageId: `mock-email-${fingerprint}` };
  }
}

class ResendEmailClient {
  constructor(options = {}) {
    this.provider = "resend";
    this.apiKey = String(options.apiKey || process.env.RESEND_API_KEY || "").trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl || process.env.RESEND_BASE_URL || DEFAULT_RESEND_BASE_URL);
    this.timeoutMs = positiveInteger(options.timeoutMs || process.env.RESEND_REQUEST_TIMEOUT_MS, 15000);
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
  }

  async send(message) {
    validateMessage(message);
    if (!this.apiKey) throw configurationError("missing_api_key");
    if (typeof this.fetchImpl !== "function") throw configurationError("fetch_unavailable");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: message.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new EmailProviderError(`http_${response.status}`, {
          statusCode: response.status,
          transient: response.status === 429 || response.status >= 500,
        });
      }

      let result;
      try {
        result = await response.json();
      } catch (error) {
        throw new EmailProviderError("invalid_response", { transient: true });
      }
      if (!result || typeof result.id !== "string" || !result.id.trim()) {
        throw new EmailProviderError("missing_provider_message_id", { transient: true });
      }
      return { providerMessageId: result.id.trim() };
    } catch (error) {
      if (error instanceof EmailProviderError) throw error;
      if (error?.name === "AbortError") {
        throw new EmailProviderError("request_timeout", { transient: true });
      }
      throw new EmailProviderError("request_failed", { transient: true });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function createEmailClient(options = {}) {
  const defaultProvider = process.env.NODE_ENV === "production" ? "resend" : "mock";
  const provider = String(options.provider || process.env.EMAIL_PROVIDER || defaultProvider).trim().toLowerCase();
  if (provider === "mock") return new MockEmailClient();
  if (provider === "resend") return new ResendEmailClient(options);
  throw configurationError("unsupported_provider");
}

function validateMessage(message = {}) {
  const required = ["to", "from", "subject", "html", "text", "idempotencyKey"];
  if (required.some((key) => !String(message[key] || "").trim())) {
    throw configurationError("invalid_message");
  }
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error("invalid");
    }
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("invalid");
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    throw configurationError("invalid_base_url");
  }
}

function configurationError(code) {
  return new EmailProviderError(code, { message: "Configuração de e-mail inválida.", transient: false });
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  DEFAULT_EMAIL_FROM,
  EmailProviderError,
  MockEmailClient,
  ResendEmailClient,
  createEmailClient,
};
