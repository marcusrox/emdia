const { logInfo, logWarn } = require("./operationalLogger");

function createWhatsAppClient() {
  const provider = String(process.env.WHATSAPP_PROVIDER || "mock").trim().toLowerCase();
  const hasEvolutionConfig = Boolean(
    process.env.EVOLUTION_API_BASE_URL &&
      process.env.EVOLUTION_API_KEY &&
      process.env.EVOLUTION_INSTANCE_NAME
  );

  if (provider === "evolution-api" && hasEvolutionConfig) {
    return new EvolutionApiWhatsAppClient({
      baseUrl: process.env.EVOLUTION_API_BASE_URL,
      apiKey: process.env.EVOLUTION_API_KEY,
      instanceName: process.env.EVOLUTION_INSTANCE_NAME,
      timeoutMs: Number(process.env.EVOLUTION_REQUEST_TIMEOUT_MS || 15000),
    });
  }

  return new MockWhatsAppClient(provider === "evolution-api" ? "Configuração da Evolution API incompleta." : "Mock ativo.");
}

class MockWhatsAppClient {
  constructor(reason) {
    this.reason = reason;
  }

  async getConnectionState() {
    return {
      ok: true,
      provider: "mock",
      state: "MOCK",
      message: this.reason,
    };
  }

  async sendText(input) {
    logInfo("whatsapp.mock.send_text", "Envio WhatsApp simulado.", {
      details: {
        to: input.to,
        messageLength: String(input.message || "").length,
      },
    });

    return {
      ok: true,
      provider: "mock",
      providerMessageId: `mock-${Date.now()}`,
    };
  }
}

class EvolutionApiWhatsAppClient {
  constructor({ baseUrl, apiKey, instanceName, timeoutMs }) {
    this.baseUrl = String(baseUrl || "").replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.instanceName = instanceName;
    this.timeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000;
  }

  async getConnectionState() {
    try {
      const payload = await this.request("GET", `/instance/connectionState/${encodeURIComponent(this.instanceName)}`);
      return {
        ok: true,
        provider: "evolution-api",
        state: payload?.instance?.state || payload?.state || "UNKNOWN",
      };
    } catch (error) {
      logWarn("whatsapp.evolution.connection_state_failed", "Falha ao consultar estado do WhatsApp.", {
        details: { message: error.message },
      });

      return {
        ok: false,
        provider: "evolution-api",
        state: "ERROR",
        message: error.message,
      };
    }
  }

  async sendText(input) {
    const payload = await this.request("POST", `/message/sendText/${encodeURIComponent(this.instanceName)}`, {
      number: input.to,
      text: input.message,
    });

    return {
      ok: true,
      provider: "evolution-api",
      providerMessageId: payload?.key?.id || payload?.messageId || payload?.id || null,
    };
  }

  async request(method, pathname, body = null) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${pathname}`, {
        method,
        headers: {
          apikey: this.apiKey,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      const payload = text ? parseJson(text) : null;
      if (!response.ok) {
        throw new Error(`Evolution API retornou HTTP ${response.status}.`);
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

module.exports = {
  EvolutionApiWhatsAppClient,
  MockWhatsAppClient,
  createWhatsAppClient,
};
