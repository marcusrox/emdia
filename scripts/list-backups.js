const { loadEnv } = require("../src/config/env");

loadEnv();

const { getBackupDirectory, listBackups } = require("../src/services/databaseBackupService");

try {
  const backups = listBackups({ backupDir: getBackupDirectory() });

  if (!backups.length) {
    console.log("Nenhum backup gerenciado foi encontrado.");
  } else {
    console.log(`${backups.length} backup(s) gerenciado(s):`);
    for (const item of backups) {
      const manifestStatus = item.manifestError ? "inválido" : item.manifest ? "presente" : "ausente";
      console.log(
        `- ${item.fileName} | ${item.sizeBytes} bytes | ${item.modifiedAt} | manifesto ${manifestStatus}`,
      );
    }
  }
} catch (error) {
  console.error(`Falha ao listar backups: ${error.message}`);
  process.exitCode = 1;
}
