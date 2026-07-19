const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readPublishedCommit } = require("../../src/services/deploymentInfoService");

const temporaryDirectories = [];

afterEach(() => {
  while (temporaryDirectories.length) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe("informações de deploy", () => {
  it("retorna o commit publicado quando o arquivo possui conteúdo válido", () => {
    const filePath = temporaryFile("Commit publicado: 0123456789abcdef0123456789abcdef01234567\n");

    assert.equal(readPublishedCommit(filePath), "Commit publicado: 0123456789abcdef0123456789abcdef01234567");
  });

  it("omite arquivo ausente ou com conteúdo inválido", () => {
    const directory = temporaryDirectory();

    assert.equal(readPublishedCommit(path.join(directory, "ausente")), "");
    assert.equal(readPublishedCommit(temporaryFile("conteúdo não confiável")), "");
  });
});

function temporaryFile(content) {
  const directory = temporaryDirectory();
  const filePath = path.join(directory, ".deploy-commit");
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "emdia-deploy-"));
  temporaryDirectories.push(directory);
  return directory;
}
