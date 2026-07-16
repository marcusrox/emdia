const { logInfo, logWarn } = require("./operationalLogger");

function createWhatsAppClient() {
  const provider = String(process.env.WHATSAPP_PROVIDER || "mock").trim().toLowerCase();

  if (provider === "evolution-api" && hasConfig([
    process.env.EVOLUTION_API_BASE_URL,
    process.env.EVOLUTION_API_KEY,
    process.env.EVOLUTION_INSTANCE_NAME,
  ])) {
    return new EvolutionApiWhatsAppClient({
      baseUrl: process.env.EVOLUTION_API_BASE_URL,
      apiKey: process.env.EVOLUTION_API_KEY,
      instanceName: process.env.EVOLUTION_INSTANCE_NAME,
      timeoutMs: Number(process.env.EVOLUTION_REQUEST_TIMEOUT_MS || 15000),
    });
  }

  if (provider === "waha" && hasConfig([
    process.env.WAHA_API_BASE_URL,
    process.env.WAHA_API_KEY,
    process.env.WAHA_SESSION,
  ])) {
    return new WahaWhatsAppClient({
      baseUrl: process.env.WAHA_API_BASE_URL,
      apiKey: process.env.WAHA_API_KEY,
      session: process.env.WAHA_SESSION,
      timeoutMs: Number(process.env.WAHA_REQUEST_TIMEOUT_MS || 15000),
    });
  }

  const reasons = {
    "evolution-api": "Configuração da Evolution API incompleta.",
    waha: "Configuração do WAHA incompleta.",
  };
  return new MockWhatsAppClient(reasons[provider] || "Mock ativo.");
}

function hasConfig(values) {
  return values.every((value) => String(value || "").trim());
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
        recipientConfigured: Boolean(input.to),
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

class WahaWhatsAppClient {
  constructor({ baseUrl, apiKey, session, timeoutMs }) {
    this.baseUrl = String(baseUrl || "").replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.session = session;
    this.timeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000;
  }

  async getConnectionState() {
    try {
      const payload = await this.request("GET", `/api/sessions/${encodeURIComponent(this.session)}`);
      if (!payload || typeof payload !== "object" || typeof payload.status !== "string") {
        throw new Error("WAHA retornou estado de sessão inválido.");
      }

      return {
        ok: true,
        provider: "waha",
        state: payload.status,
      };
    } catch (error) {
      logWarn("whatsapp.waha.connection_state_failed", "Falha ao consultar estado do WhatsApp.", {
        details: { message: error.message },
      });

      return {
        ok: false,
        provider: "waha",
        state: "ERROR",
        message: error.message,
      };
    }
  }

  async sendText(input) {
    const payload = await this.request("POST", "/api/sendText", {
      session: this.session,
      chatId: toWahaChatId(input.to),
      text: input.message,
    });

    return {
      ok: true,
      provider: "waha",
      providerMessageId: wahaMessageId(payload),
    };
  }

  async request(method, pathname, body = null) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${pathname}`, {
        method,
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) throw wahaHttpError(response.status, method, pathname);
      if (!text) return null;

      const payload = parseWahaJson(text);
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Tempo limite excedido ao comunicar com o WAHA.");
      }
      if (error?.isWahaError || String(error?.message || "").startsWith("WAHA retornou")) throw error;
      throw new Error("Falha de comunicação com o WAHA.");
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toWahaChatId(value) {
  const raw = String(value || "").trim();
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) {
    throw new Error("Telefone WhatsApp inválido para envio.");
  }

  const digits = raw.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error("Telefone WhatsApp inválido para envio.");
  }
  return `${digits}@c.us`;
}

function wahaMessageId(payload) {
  const candidates = [payload?.id?._serialized, payload?.id, payload?.key?.id, payload?.messageId];
  return candidates.find((value) => typeof value === "string" && value) || null;
}

function wahaHttpError(status, method, pathname) {
  let message = `WAHA retornou HTTP ${status}.`;
  if (status === 401 || status === 403) {
    message = "WAHA recusou a autenticação; verifique a credencial e suas permissões.";
  } else if (status === 404 && method === "GET" && pathname.startsWith("/api/sessions/")) {
    message = "Sessão WAHA não encontrada; verifique WAHA_SESSION.";
  }

  const error = new Error(message);
  error.isWahaError = true;
  return error;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function parseWahaJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("WAHA retornou resposta JSON inválida.");
  }
}

module.exports = {
  EvolutionApiWhatsAppClient,
  MockWhatsAppClient,
  WahaWhatsAppClient,
  createWhatsAppClient,
  toWahaChatId,
};
