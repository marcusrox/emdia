const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {
  detailsSummary,
  listLogDates,
  listOperationalLogs,
} = require("../../src/services/operationalLogReader");

const originalFs = {
  existsSync: fs.existsSync,
  readFileSync: fs.readFileSync,
  readdirSync: fs.readdirSync,
};

afterEach(() => {
  fs.existsSync = originalFs.existsSync;
  fs.readFileSync = originalFs.readFileSync;
  fs.readdirSync = originalFs.readdirSync;
});

describe("leitura de logs operacionais", () => {
  it("lista somente arquivos diários válidos em ordem decrescente", () => {
    fs.existsSync = () => true;
    fs.readdirSync = () => [
      "operacional-2026-08-06.log",
      "README.txt",
      "operacional-2026-08-07.log",
      "operacional-2026-8-7.log",
    ];

    assert.deepEqual(listLogDates(), ["2026-08-07", "2026-08-06"]);
  });

  it("retorna coleção vazia quando o diretório não existe", () => {
    fs.existsSync = () => false;
    assert.deepEqual(listLogDates(), []);
    assert.deepEqual(listOperationalLogs(), {
      entries: [],
      filters: { date: "", level: "", event: "", q: "", since: "", limit: 200 },
      dates: [],
    });
  });

  it("normaliza, filtra, ordena e limita eventos sem expor caminhos", () => {
    fs.existsSync = () => true;
    fs.readdirSync = () => ["operacional-2026-08-07.log"];
    fs.readFileSync = () => [
      JSON.stringify({
        timestamp: "2026-08-07T12:00:00.000Z",
        level: "warn",
        event: "business.settlement.blocked",
        message: "Baixa recusada",
        username: "usuario@example.test",
        requestId: "REQ-2",
        details: { reason: "paid" },
      }),
      JSON.stringify({
        timestamp: "2026-08-07T13:00:00.000Z",
        level: "warn",
        event: "business.settlement.blocked",
        message: "Outra baixa recusada",
        userId: "usr_1",
        requestId: "REQ-3",
        details: { reason: "cancelled" },
      }),
      JSON.stringify({
        timestamp: "2026-08-07T14:00:00.000Z",
        level: "error",
        event: "app.unexpected_error",
        message: "Falha interna",
      }),
      "",
    ].join("\n");

    const result = listOperationalLogs({
      date: "../../.env",
      level: "warn",
      event: "SETTLEMENT",
      q: "req",
      since: "2026-08-07T11:00:00.000Z",
      limit: "1",
    });

    assert.equal(result.filters.date, "2026-08-07");
    assert.equal(result.filters.limit, 1);
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].requestId, "REQ-3");
    assert.equal(result.entries[0].lineNumber, 2);
    assert.equal(result.entries[0].invalid, false);
  });

  it("representa linha inválida de forma segura e normaliza filtros fora do limite", () => {
    fs.existsSync = () => true;
    fs.readdirSync = () => ["operacional-2026-08-07.log"];
    fs.readFileSync = () => `${"x".repeat(700)}\n${JSON.stringify({ level: "debug" })}\n`;

    const invalid = listOperationalLogs({ q: "linha de log inválida", limit: "900" });
    assert.equal(invalid.filters.limit, 500);
    assert.equal(invalid.entries.length, 1);
    assert.equal(invalid.entries[0].event, "log.invalid_json");
    assert.equal(invalid.entries[0].details.raw.length, 500);

    const normalized = listOperationalLogs({ level: "debug", since: "data inválida", limit: "0" });
    assert.equal(normalized.filters.level, "");
    assert.equal(normalized.filters.since, "");
    assert.equal(normalized.filters.limit, 1);
    assert.equal(normalized.entries[0].level, "info");
    assert.equal(normalized.entries[0].event, "app.event");
  });

  it("resume detalhes serializáveis e tolera referências circulares", () => {
    assert.equal(detailsSummary({ status: "ok", count: 2 }), '{"status":"ok","count":2}');
    assert.equal(detailsSummary(null), "");
    const circular = {};
    circular.self = circular;
    assert.equal(detailsSummary(circular), "");
  });
});
