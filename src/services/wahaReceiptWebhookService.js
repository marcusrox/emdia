const crypto = require("node:crypto");
const ReceiptImport = require("../models/ReceiptImport");
const User = require("../models/User");

function verifyWebhook(rawBody, headers, now = Date.now()) {
  const secret = String(process.env.WAHA_WEBHOOK_HMAC_KEY || "");
  if (!secret) return { ok: false, status: 401, reason: "hmac_not_configured" };
  const algorithm = header(headers, "x-webhook-hmac-algorithm").toLowerCase();
  const signature = header(headers, "x-webhook-hmac");
  if (algorithm !== "sha512" || !signature) return { ok: false, status: 401, reason: "missing_signature" };

  const timestamp = Number(header(headers, "x-webhook-timestamp"));
  const maxAgeSeconds = positiveNumber(process.env.WAHA_WEBHOOK_MAX_AGE_SECONDS, 300);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > maxAgeSeconds * 1000) {
    return { ok: false, status: 403, reason: "replay_rejected" };
  }

  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest();
  const received = decodeSignature(signature);
  if (!received || received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return { ok: false, status: 403, reason: "invalid_signature" };
  }
  return { ok: true };
}

async function acceptWebhook(rawBody, headers, options = {}) {
  const verified = verifyWebhook(rawBody, headers, options.now || Date.now());
  if (!verified.ok) return verified;
  let event;
  try { event = JSON.parse(rawBody.toString("utf8")); } catch { return { ok: false, status: 400, reason: "invalid_json" }; }
  const requestId = safeId(header(headers, "x-webhook-request-id"));
  const logDetails = webhookLogDetails(event);
  const validation = validateEvent(event);
  if (!validation.ok) return { ...validation, requestId, eventName: safeId(event?.event), logDetails };
  if (validation.ignored) {
    return { ok: true, ignored: true, reason: validation.reason, requestId, eventName: "message", logDetails };
  }

  let senderPhone;
  try {
    senderPhone = await resolveSenderPhone(validation.payload.from, options.fetchImpl || fetch);
  } catch (error) {
    error.webhookLogDetails = { ...logDetails, stage: "sender_resolution" };
    throw error;
  }
  if (!senderPhone) {
    return {
      ok: true,
      ignored: true,
      reason: "sender_unresolved",
      requestId,
      eventName: "message",
      logDetails: { ...logDetails, stage: "sender_resolution" },
    };
  }
  const user = User.findActiveByPhoneE164(senderPhone);
  if (!user) {
    return {
      ok: true,
      ignored: true,
      reason: "user_not_found",
      requestId,
      eventName: "message",
      logDetails: { ...logDetails, stage: "user_lookup", senderPhoneE164: senderPhone },
    };
  }

  const inserted = ReceiptImport.createFromWebhook({
    user_id: user.id,
    provider_event_id: safeId(event.id || event.eventId),
    provider_message_id: safeId(validation.payload.id),
    webhook_request_id: requestId,
    provider_media_url: validation.payload.media.url,
    source_chat_id: validation.payload.from,
    sender_phone_e164: senderPhone,
    message_timestamp: normalizeTimestamp(validation.payload.timestamp),
    original_filename: validation.payload.media.filename,
  });
  return {
    ok: true,
    created: inserted.created,
    duplicate: !inserted.created,
    receiptId: inserted.receipt?.id,
    userId: user.id,
    requestId,
    eventName: "message",
    logDetails: {
      ...logDetails,
      stage: "persisted",
      phoneMatchStrategy: user.phone_match_strategy || "exact",
    },
  };
}

function webhookLogDetails(event) {
  const payload = event && typeof event.payload === "object" ? event.payload : {};
  const from = String(payload?.from || "");
  const mime = String(payload?.media?.mimetype || payload?.media?.mimeType || "").toLowerCase();
  return compactObject({
    stage: "validated",
    event: safeValue(event?.event, 60),
    wahaInstance: safeValue(event?.session, 80),
    engine: safeValue(event?.engine, 40),
    providerEventRef: technicalReference(event?.id || event?.eventId),
    providerMessageRef: technicalReference(payload?.id),
    senderType: senderType(from),
    senderRef: from ? privateReference(from) : "",
    fromMe: typeof payload?.fromMe === "boolean" ? payload.fromMe : undefined,
    hasMedia: typeof payload?.hasMedia === "boolean" ? payload.hasMedia : undefined,
    mediaMime: safeValue(mime, 80),
    messageTimestamp: normalizeTimestamp(payload?.timestamp),
  });
}

function senderType(value) {
  const chatId = String(value || "");
  if (/^[1-9]\d{7,14}@(c\.us|s\.whatsapp\.net)$/.test(chatId)) return "individual";
  if (/^[1-9]\d{7,19}@lid$/.test(chatId)) return "lid";
  if (chatId.endsWith("@g.us")) return "group";
  if (chatId.endsWith("@broadcast")) return "broadcast";
  return chatId ? "unsupported" : "missing";
}

function technicalReference(value) {
  const clean = safeValue(value, 160);
  if (!clean) return "";
  if (/^[a-zA-Z0-9_.:-]{1,100}$/.test(clean) && !/\d{8,}/.test(clean)) return clean;
  return privateReference(clean);
}

function privateReference(value) {
  const secret = String(process.env.WAHA_WEBHOOK_HMAC_KEY || "");
  if (!secret || !value) return "unavailable";
  return `hmac:${crypto.createHmac("sha256", secret).update(String(value)).digest("hex").slice(0, 16)}`;
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ""));
}

function safeValue(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength);
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return { ok: false, status: 400, reason: "invalid_payload" };
  if (event.event !== "message") return { ok: true, ignored: true, reason: "irrelevant_event" };
  if (String(event.session || "") !== String(process.env.WAHA_SESSION || "")) {
    return { ok: true, ignored: true, reason: "different_session" };
  }
  const payload = event.payload;
  if (!payload || typeof payload !== "object") return { ok: false, status: 400, reason: "missing_payload" };
  if (payload.fromMe === true) return { ok: true, ignored: true, reason: "own_message" };
  if (!safeId(payload.id) || typeof payload.from !== "string") return { ok: false, status: 400, reason: "missing_message_fields" };
  if (payload.hasMedia !== true) return { ok: true, ignored: true, reason: "without_media" };
  if (!payload.media || typeof payload.media.url !== "string" || !payload.media.url) {
    return { ok: false, status: 400, reason: "missing_media_url" };
  }
  const mime = String(payload.media.mimetype || payload.media.mimeType || "").toLowerCase();
  if (mime && !["image/jpeg", "image/png"].includes(mime)) {
    return { ok: true, ignored: true, reason: "unsupported_media_type" };
  }
  return { ok: true, payload };
}

async function resolveSenderPhone(chatId, fetchImpl = fetch) {
  const direct = directPhoneFromChatId(chatId);
  if (direct) return direct;
  const lidMatch = /^([1-9]\d{7,19})@lid$/.exec(String(chatId || ""));
  if (!lidMatch) return null;
  const baseUrl = String(process.env.WAHA_API_BASE_URL || "").replace(/\/+$/, "");
  const session = String(process.env.WAHA_SESSION || "");
  const apiKey = String(process.env.WAHA_API_KEY || "");
  if (!baseUrl || !session || !apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), positiveNumber(process.env.WAHA_REQUEST_TIMEOUT_MS, 15000));
  try {
    const response = await fetchImpl(`${baseUrl}/api/${encodeURIComponent(session)}/lids/${encodeURIComponent(lidMatch[1])}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (response.status === 429 || response.status >= 500) {
      const error = new Error("WAHA_LID_TEMPORARILY_UNAVAILABLE");
      error.code = "WAHA_LID_TEMPORARILY_UNAVAILABLE";
      error.retryable = true;
      throw error;
    }
    if (!response.ok) return null;
    const payload = await response.json();
    return directPhoneFromChatId(payload?.pn);
  } catch (error) {
    if (error?.code === "WAHA_LID_TEMPORARILY_UNAVAILABLE") throw error;
    if (error?.name === "AbortError") {
      const timeoutError = new Error("WAHA_LID_TIMEOUT");
      timeoutError.code = "WAHA_LID_TIMEOUT";
      timeoutError.retryable = true;
      throw timeoutError;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function directPhoneFromChatId(value) {
  const match = /^([1-9]\d{7,14})@(c\.us|s\.whatsapp\.net)$/.exec(String(value || ""));
  return match ? `+${match[1]}` : null;
}

function normalizeTimestamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  const milliseconds = number < 100000000000 ? number * 1000 : number;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function decodeSignature(value) {
  const clean = String(value || "").trim().replace(/^sha512=/i, "");
  try {
    if (/^[a-f0-9]{128}$/i.test(clean)) return Buffer.from(clean, "hex");
    const decoded = Buffer.from(clean, "base64");
    return decoded.length ? decoded : null;
  } catch { return null; }
}

function header(headers, name) {
  if (typeof headers?.get === "function") return String(headers.get(name) || "");
  return String(headers?.[name] || headers?.[name.toLowerCase()] || "");
}
function safeId(value) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160); }
function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

module.exports = {
  acceptWebhook,
  directPhoneFromChatId,
  normalizeTimestamp,
  resolveSenderPhone,
  senderType,
  technicalReference,
  validateEvent,
  verifyWebhook,
  webhookLogDetails,
};
