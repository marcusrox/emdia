const { loadEnv } = require("../src/config/env");

loadEnv();

const { dbPath } = require("../src/database/connection");
const { createBackup, getBackupDirectory } = require("../src/services/databaseBackupService");

main().catch(fail);

async function main() {
  const result = await createBackup({
    sourcePath: dbPath,
    backupDir: getBackupDirectory(),
  });

  console.log("Backup criado e verificado com sucesso.");
  console.log(`Arquivo: ${result.fileName}`);
  console.log(`Tamanho: ${result.sizeBytes} bytes`);
  console.log(`Migration: ${result.schemaMigration || "nenhuma"}`);
  console.log(`SHA-256: ${result.sha256}`);
}

function fail(error) {
  console.error(`Falha ao criar backup: ${error.message}`);
  process.exitCode = 1;
}
