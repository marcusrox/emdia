const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

async function downloadReceiptMedia(receipt, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const maxBytes = positiveNumber(process.env.RECEIPT_MAX_BYTES, DEFAULT_MAX_BYTES);
  const timeoutMs = positiveNumber(process.env.WAHA_REQUEST_TIMEOUT_MS, 15000);
  const mediaUrl = validateMediaUrl(receipt.provider_media_url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(mediaUrl, {
      headers: { "X-Api-Key": requiredEnv("WAHA_API_KEY") },
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status < 400) throw receiptError("MEDIA_REDIRECT_BLOCKED", false);
    if (!response.ok) throw receiptError("MEDIA_DOWNLOAD_FAILED", response.status >= 500 || response.status === 429);

    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > maxBytes) throw receiptError("MEDIA_TOO_LARGE", false);
    const directory = ensureStorageDirectory();
    const temporaryPath = path.join(directory, `.receipt-${crypto.randomBytes(18).toString("hex")}.tmp`);
    try {
      const downloaded = await streamBodyToTemporaryFile(response.body, temporaryPath, maxBytes);
      const detected = detectImage(downloaded.signature);
      if (!detected) throw receiptError("UNSUPPORTED_MEDIA", false);
      const declaredMime = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
      if (declaredMime && declaredMime !== "application/octet-stream" && declaredMime !== detected.mimeType) {
        throw receiptError("UNSUPPORTED_MEDIA", false);
      }
      const storageKey = `${receipt.id}-${crypto.randomBytes(12).toString("hex")}.${detected.extension}`;
      const finalPath = safeStoragePath(storageKey, directory);
      fs.renameSync(temporaryPath, finalPath);
      return {
        storageKey,
        mimeType: detected.mimeType,
        sizeBytes: downloaded.sizeBytes,
        sha256: downloaded.sha256,
      };
    } catch (error) {
      try { fs.rmSync(temporaryPath, { force: true }); } catch {}
      throw error;
    }
  } catch (error) {
    if (error?.name === "AbortError") throw receiptError("MEDIA_DOWNLOAD_TIMEOUT", true);
    if (error?.code) throw error;
    throw receiptError("MEDIA_DOWNLOAD_FAILED", true);
  } finally {
    clearTimeout(timeout);
  }
}

function validateMediaUrl(value) {
  let mediaUrl;
  let baseUrl;
  try {
    mediaUrl = new URL(String(value || ""));
    baseUrl = new URL(requiredEnv("WAHA_API_BASE_URL"));
  } catch {
    throw receiptError("INVALID_MEDIA_URL", false);
  }
  if (
    !["http:", "https:"].includes(mediaUrl.protocol)
    || mediaUrl.origin !== baseUrl.origin
    || mediaUrl.username
    || mediaUrl.password
    || mediaUrl.hash
  ) throw receiptError("INVALID_MEDIA_URL", false);
  return mediaUrl.href;
}

async function streamBodyToTemporaryFile(body, temporaryPath, maxBytes) {
  if (!body || typeof body.getReader !== "function") throw receiptError("MEDIA_DOWNLOAD_FAILED", true);
  const file = fs.openSync(temporaryPath, "wx", 0o600);
  const hash = crypto.createHash("sha256");
  const signatureParts = [];
  let signatureSize = 0;
  let size = 0;
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw receiptError("MEDIA_TOO_LARGE", false);
      }
      const chunk = Buffer.from(value);
      if (signatureSize < 8) {
        const part = chunk.subarray(0, 8 - signatureSize);
        signatureParts.push(part);
        signatureSize += part.length;
      }
      hash.update(chunk);
      fs.writeSync(file, chunk);
    }
    fs.fsyncSync(file);
    return {
      sizeBytes: size,
      sha256: hash.digest("hex"),
      signature: Buffer.concat(signatureParts, signatureSize),
    };
  } finally {
    fs.closeSync(file);
  }
}

function detectImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(png)) {
    return { mimeType: "image/png", extension: "png" };
  }
  return null;
}

function ensureStorageDirectory() {
  const configured = String(process.env.RECEIPT_STORAGE_DIR || "uploads/receipts").trim();
  const directory = path.resolve(configured);
  const publicDirectory = path.resolve("public");
  if (directory === publicDirectory || directory.startsWith(`${publicDirectory}${path.sep}`)) {
    throw receiptError("INVALID_STORAGE_DIRECTORY", false);
  }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stats = fs.lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw receiptError("INVALID_STORAGE_DIRECTORY", false);
  return fs.realpathSync(directory);
}

function getStoredReceipt(storageKey) {
  const directory = ensureStorageDirectory();
  const filePath = safeStoragePath(storageKey, directory);
  const stats = fs.lstatSync(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) throw receiptError("MEDIA_NOT_FOUND", false);
  return { filePath, sizeBytes: stats.size };
}

function deleteStoredReceipt(storageKey) {
  if (!storageKey) return;
  const directory = ensureStorageDirectory();
  const filePath = safeStoragePath(storageKey, directory);
  try {
    const stats = fs.lstatSync(filePath);
    if (stats.isFile() && !stats.isSymbolicLink()) fs.rmSync(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function readStoredReceipt(storageKey) {
  const stored = getStoredReceipt(storageKey);
  return fs.readFileSync(stored.filePath);
}

function safeStoragePath(storageKey, directory = ensureStorageDirectory()) {
  if (!/^[a-zA-Z0-9_-]+\.(jpg|png)$/.test(String(storageKey || ""))) {
    throw receiptError("INVALID_STORAGE_KEY", false);
  }
  const resolved = path.resolve(directory, storageKey);
  if (!resolved.startsWith(`${directory}${path.sep}`)) throw receiptError("INVALID_STORAGE_KEY", false);
  return resolved;
}

function receiptError(code, retryable) {
  const error = new Error(code);
  error.code = code;
  error.retryable = retryable;
  return error;
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw receiptError("RECEIPT_CONFIGURATION_MISSING", false);
  return value;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

module.exports = {
  deleteStoredReceipt,
  detectImage,
  downloadReceiptMedia,
  getStoredReceipt,
  readStoredReceipt,
  validateMediaUrl,
};
