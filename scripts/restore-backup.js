const path = require("node:path");
const { loadEnv } = require("../src/config/env");

loadEnv();

const { dbPath } = require("../src/database/connection");
const { getBackupDirectory, restoreBackup } = require("../src/services/databaseBackupService");

main().catch(fail);

async function main() {
  const backupPath = positionalArgument();
  const confirmed = process.argv.slice(2).includes("--confirm");
  const result = await restoreBackup({
    backupPath,
    targetPath: dbPath,
    backupDir: getBackupDirectory(),
    confirmed,
  });

  console.log("Banco restaurado e verificado com sucesso.");
  console.log(`Origem: ${path.basename(result.backupPath)}`);
  console.log(`Backup de segurança: ${result.safetyBackup.fileName}`);
  console.log(`Migration: ${result.verification.schemaMigration || "nenhuma"}`);
  console.log("Reinicie o EmDia para utilizar o banco restaurado.");
}

function positionalArgument() {
  const value = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!value) {
    throw new Error("Informe o backup: npm run restore -- backups\\arquivo.sqlite --confirm");
  }
  return path.resolve(value);
}

function fail(error) {
  console.error(`Falha ao restaurar backup: ${error.message}`);
  if (error.recoveryBackup) {
    console.error(`Backup de recuperação preservado: ${path.basename(error.recoveryBackup)}`);
  }
  if (error.rollbackError) {
    console.error("A recuperação automática do banco anterior também falhou. Não inicie a aplicação antes de recuperar o backup de segurança.");
  }
  process.exitCode = 1;
}
