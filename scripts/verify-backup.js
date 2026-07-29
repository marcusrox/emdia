const path = require("node:path");
const { loadEnv } = require("../src/config/env");

loadEnv();

const { getBackupDirectory, verifyBackup } = require("../src/services/databaseBackupService");

main().catch(fail);

async function main() {
  const backupPath = positionalArgument();
  const result = await verifyBackup(backupPath, {
    backupDir: getBackupDirectory(),
  });

  console.log("Backup íntegro e compatível com o EmDia.");
  console.log(`Arquivo: ${result.fileName}`);
  console.log(`Tamanho: ${result.sizeBytes} bytes`);
  console.log(`Migration: ${result.schemaMigration || "nenhuma"}`);
  console.log(`SHA-256: ${result.sha256}`);
  console.log(`Manifesto: ${result.manifest ? "válido" : "não encontrado"}`);
}

function positionalArgument() {
  const value = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!value) {
    throw new Error("Informe o backup: npm run backup:verify -- backups\\arquivo.sqlite");
  }
  return path.resolve(value);
}

function fail(error) {
  console.error(`Falha ao verificar backup: ${error.message}`);
  process.exitCode = 1;
}
