const fs = require("node:fs");
const path = require("node:path");
const { createHash, randomBytes } = require("node:crypto");
const { backup, DatabaseSync } = require("node:sqlite");
const { BUSY_TIMEOUT_MS } = require("../database/connection");
const { acquireDatabaseLock } = require("./databaseLockService");
const { logError, logInfo } = require("./operationalLogger");

const projectRoot = path.resolve(__dirname, "..", "..");
const defaultBackupDir = path.join(projectRoot, "backups");
const SQLITE_HEADER = Buffer.from("SQLite format 3\0", "utf8");
const MANAGED_BACKUP_PATTERN = /^emdia-(backup|before-restore)-\d{8}T\d{9}Z-[a-f0-9]{8}\.sqlite$/;

function getBackupDirectory() {
  return path.resolve(process.env.EMDIA_BACKUP_DIR || defaultBackupDir);
}

async function createBackup({
  sourcePath,
  backupDir = getBackupDirectory(),
  kind = "backup",
  now = new Date(),
} = {}) {
  const resolvedSource = requireDatabaseFile(sourcePath);
  const resolvedBackupDir = ensureBackupDirectory(backupDir);
  const fileName = backupFileName(kind, now);
  const destinationPath = path.join(resolvedBackupDir, fileName);
  const partialPath = path.join(resolvedBackupDir, `.${fileName}.partial.sqlite`);
  const manifestPath = `${destinationPath}.json`;
  const partialManifestPath = `${manifestPath}.partial`;

  if (fs.existsSync(destinationPath) || fs.existsSync(partialPath)) {
    throw new Error(`O arquivo de backup ${fileName} já existe.`);
  }

  try {
    await copyDatabase(resolvedSource, partialPath);
    const verification = await verifyDatabaseFile(partialPath);
    const manifest = {
      format_version: 1,
      created_at: now.toISOString(),
      file: fileName,
      size_bytes: verification.sizeBytes,
      sha256: verification.sha256,
      schema_migration: verification.schemaMigration,
      integrity_check: "ok",
      foreign_key_violations: 0,
    };

    fs.writeFileSync(partialManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    fs.renameSync(partialPath, destinationPath);

    try {
      fs.renameSync(partialManifestPath, manifestPath);
    } catch (error) {
      removeFileIfExists(destinationPath);
      throw error;
    }

    logInfo("database.backup.completed", "Backup do banco criado e verificado.", {
      details: {
        file: fileName,
        kind,
        sizeBytes: verification.sizeBytes,
        schemaMigration: verification.schemaMigration,
      },
    });

    return {
      path: destinationPath,
      manifestPath,
      fileName,
      ...verification,
    };
  } catch (error) {
    removeFileIfExists(partialPath);
    removeFileIfExists(partialManifestPath);
    logError("database.backup.failed", "Falha ao criar backup do banco.", {
      details: {
        file: fileName,
        kind,
        message: error.message,
      },
    });
    throw error;
  }
}

async function verifyBackup(backupPath, { backupDir = getBackupDirectory() } = {}) {
  const resolvedBackup = resolveManagedBackupPath(backupPath, backupDir);
  const verification = await verifyDatabaseFile(resolvedBackup);
  const manifest = readAndValidateManifest(resolvedBackup, verification);

  return {
    path: resolvedBackup,
    fileName: path.basename(resolvedBackup),
    manifest,
    ...verification,
  };
}

function listBackups({ backupDir = getBackupDirectory() } = {}) {
  const resolvedBackupDir = ensureBackupDirectory(backupDir);

  return fs
    .readdirSync(resolvedBackupDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MANAGED_BACKUP_PATTERN.test(entry.name))
    .map((entry) => {
      const backupPath = path.join(resolvedBackupDir, entry.name);
      const stat = fs.statSync(backupPath);
      let manifest = null;
      let manifestError = null;
      try {
        manifest = readManifestIfPresent(backupPath);
      } catch (error) {
        manifestError = error.message;
      }
      return {
        path: backupPath,
        fileName: entry.name,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        manifest,
        manifestError,
      };
    })
    .sort(
      (left, right) =>
        right.modifiedAt.localeCompare(left.modifiedAt) ||
        right.fileName.localeCompare(left.fileName),
    );
}

async function restoreBackup({
  backupPath,
  targetPath,
  backupDir = getBackupDirectory(),
  confirmed = false,
  now = new Date(),
  hooks = {},
} = {}) {
  if (confirmed !== true) {
    const error = new Error("A restauração exige confirmação explícita com --confirm.");
    error.code = "EMDIA_RESTORE_CONFIRMATION_REQUIRED";
    throw error;
  }

  const resolvedBackup = resolveManagedBackupPath(backupPath, backupDir);
  const resolvedTarget = requireDatabaseFile(targetPath);

  if (resolvedBackup === resolvedTarget) {
    throw new Error("O backup de origem não pode ser o próprio banco ativo.");
  }

  const sourceVerification = await verifyBackup(resolvedBackup, { backupDir });
  const databaseLock = acquireDatabaseLock(resolvedTarget, { owner: "restore" });
  const token = randomBytes(6).toString("hex");
  const preparedPath = path.join(
    path.dirname(resolvedTarget),
    `.${path.basename(resolvedTarget)}.restore-${token}.sqlite`,
  );
  const rollbackPath = path.join(
    path.dirname(resolvedTarget),
    `.${path.basename(resolvedTarget)}.rollback-${token}`,
  );
  let safetyBackup = null;
  let originalMoved = false;

  try {
    assertDatabaseAvailableForRestore(resolvedTarget);
    safetyBackup = await createBackup({
      sourcePath: resolvedTarget,
      backupDir,
      kind: "before-restore",
      now,
    });

    await copyDatabase(resolvedBackup, preparedPath);
    await verifyDatabaseFile(preparedPath);
    moveDatabaseFamily(resolvedTarget, rollbackPath);
    originalMoved = true;

    if (typeof hooks.afterTargetMoved === "function") {
      await hooks.afterTargetMoved();
    }

    fs.renameSync(preparedPath, resolvedTarget);
    const restoredVerification = await verifyDatabaseFile(resolvedTarget);
    removeDatabaseFamily(rollbackPath);
    originalMoved = false;

    logInfo("database.restore.completed", "Banco restaurado e verificado.", {
      details: {
        backupFile: path.basename(resolvedBackup),
        safetyBackupFile: safetyBackup.fileName,
        sizeBytes: restoredVerification.sizeBytes,
        schemaMigration: restoredVerification.schemaMigration,
      },
    });

    return {
      targetPath: resolvedTarget,
      backupPath: resolvedBackup,
      safetyBackup,
      sourceVerification,
      verification: restoredVerification,
    };
  } catch (error) {
    if (originalMoved) {
      try {
        removeDatabaseFamily(resolvedTarget);
        moveDatabaseFamily(rollbackPath, resolvedTarget);
        originalMoved = false;
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
    }

    if (safetyBackup) error.recoveryBackup = safetyBackup.path;

    logError("database.restore.failed", "Falha ao restaurar banco.", {
      details: {
        backupFile: path.basename(resolvedBackup),
        safetyBackupFile: safetyBackup?.fileName || null,
        message: error.message,
        rollbackMessage: error.rollbackError?.message || null,
      },
    });
    throw error;
  } finally {
    removeFileIfExists(preparedPath);
    if (!originalMoved) removeDatabaseFamily(rollbackPath);
    databaseLock.release();
  }
}

async function copyDatabase(sourcePath, destinationPath) {
  let sourceDatabase;
  try {
    sourceDatabase = new DatabaseSync(sourcePath, { readOnly: true });
    sourceDatabase.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
    await backup(sourceDatabase, destinationPath);
  } finally {
    sourceDatabase?.close();
  }
}

async function verifyDatabaseFile(databasePath) {
  assertRegularSqliteFile(databasePath);

  let database;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    database.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
    database.exec("PRAGMA query_only = ON;");

    const integrityRows = database.prepare("PRAGMA integrity_check;").all();
    const integrityMessages = integrityRows.map((row) => String(Object.values(row)[0] || ""));
    if (integrityMessages.length !== 1 || integrityMessages[0].toLowerCase() !== "ok") {
      throw new Error(`Falha no integrity_check: ${integrityMessages.join("; ") || "sem resultado"}.`);
    }

    const foreignKeyViolations = database.prepare("PRAGMA foreign_key_check;").all();
    if (foreignKeyViolations.length) {
      throw new Error(`O backup possui ${foreignKeyViolations.length} violação(ões) de chave estrangeira.`);
    }

    const migrationsTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .get();
    if (!migrationsTable) {
      throw new Error("O arquivo não possui a tabela schema_migrations do EmDia.");
    }

    const latestMigration = database
      .prepare("SELECT id FROM schema_migrations ORDER BY applied_at DESC, id DESC LIMIT 1")
      .get();
    const stat = fs.statSync(databasePath);

    return {
      integrityCheck: "ok",
      foreignKeyViolations: 0,
      schemaMigration: latestMigration?.id || null,
      sizeBytes: stat.size,
      sha256: await sha256File(databasePath),
    };
  } catch (error) {
    throw new Error(`Backup SQLite inválido: ${error.message}`, { cause: error });
  } finally {
    database?.close();
  }
}

function assertDatabaseAvailableForRestore(databasePath) {
  let database;
  try {
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA busy_timeout = 0;");
    database.exec("BEGIN EXCLUSIVE;");
    database.exec("ROLLBACK;");
  } catch (error) {
    try {
      database?.exec("ROLLBACK;");
    } catch {
      // Nenhuma transação foi aberta.
    }
    const unavailable = new Error("O banco está ocupado. Encerre a aplicação antes de restaurar.", {
      cause: error,
    });
    unavailable.code = "EMDIA_DATABASE_IN_USE";
    throw unavailable;
  } finally {
    database?.close();
  }
}

function resolveManagedBackupPath(backupPath, backupDir) {
  const value = String(backupPath || "").trim();
  if (!value) throw new Error("Informe o arquivo de backup.");

  const resolvedBackupDir = ensureBackupDirectory(backupDir);
  const candidate = path.resolve(value);
  if (!isPathInside(resolvedBackupDir, candidate)) {
    throw new Error("O arquivo de backup deve estar dentro do diretório configurado.");
  }

  const realBackupDir = fs.realpathSync(resolvedBackupDir);
  const realCandidate = fs.realpathSync(candidate);
  if (!isPathInside(realBackupDir, realCandidate)) {
    throw new Error("O arquivo de backup não pode apontar para fora do diretório configurado.");
  }

  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("O caminho informado deve ser um arquivo de backup regular.");
  }

  if (!candidate.toLowerCase().endsWith(".sqlite")) {
    throw new Error("O arquivo de backup deve usar a extensão .sqlite.");
  }

  return candidate;
}

function requireDatabaseFile(databasePath) {
  const value = String(databasePath || "").trim();
  if (!value || value === ":memory:") {
    throw new Error("A operação exige um banco SQLite persistido em arquivo.");
  }

  const resolved = path.resolve(value);
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new Error("O caminho do banco deve apontar para um arquivo regular.");
  return resolved;
}

function assertRegularSqliteFile(databasePath) {
  const stat = fs.statSync(databasePath);
  if (!stat.isFile() || stat.size < SQLITE_HEADER.length) {
    throw new Error("O arquivo não possui tamanho válido para um banco SQLite.");
  }

  const descriptor = fs.openSync(databasePath, "r");
  try {
    const header = Buffer.alloc(SQLITE_HEADER.length);
    fs.readSync(descriptor, header, 0, header.length, 0);
    if (!header.equals(SQLITE_HEADER)) {
      throw new Error("A assinatura do arquivo não corresponde ao formato SQLite.");
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function readAndValidateManifest(backupPath, verification) {
  const manifest = readManifestIfPresent(backupPath);
  if (!manifest) return null;

  if (manifest.file !== path.basename(backupPath)) {
    throw new Error("O manifesto não corresponde ao arquivo de backup informado.");
  }
  if (manifest.size_bytes !== verification.sizeBytes) {
    throw new Error("O tamanho do backup não corresponde ao manifesto.");
  }
  if (manifest.sha256 !== verification.sha256) {
    throw new Error("O checksum do backup não corresponde ao manifesto.");
  }
  return manifest;
}

function readManifestIfPresent(backupPath) {
  const manifestPath = `${backupPath}.json`;
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const stat = fs.lstatSync(manifestPath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("o manifesto deve ser um arquivo regular");
    }
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Manifesto de backup inválido: ${error.message}`, { cause: error });
  }
}

function ensureBackupDirectory(backupDir) {
  const resolved = path.resolve(String(backupDir || defaultBackupDir));
  fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) throw new Error("O destino de backups deve ser um diretório.");
  return resolved;
}

function backupFileName(kind, now) {
  const normalizedKind = kind === "before-restore" ? "before-restore" : "backup";
  const timestamp = now.toISOString().replaceAll("-", "").replaceAll(":", "").replace(".", "");
  return `emdia-${normalizedKind}-${timestamp}-${randomBytes(4).toString("hex")}.sqlite`;
}

function isPathInside(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath);
  return Boolean(relative) && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function moveDatabaseFamily(sourceBase, destinationBase) {
  const moved = [];
  try {
    for (const suffix of ["", "-wal", "-shm"]) {
      const source = `${sourceBase}${suffix}`;
      if (!fs.existsSync(source)) continue;
      const destination = `${destinationBase}${suffix}`;
      fs.renameSync(source, destination);
      moved.push({ source, destination });
    }
  } catch (error) {
    for (const item of moved.reverse()) {
      if (fs.existsSync(item.destination)) fs.renameSync(item.destination, item.source);
    }
    throw error;
  }
}

function removeDatabaseFamily(basePath) {
  for (const suffix of ["", "-wal", "-shm"]) {
    removeFileIfExists(`${basePath}${suffix}`);
  }
}

function removeFileIfExists(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

module.exports = {
  createBackup,
  getBackupDirectory,
  listBackups,
  restoreBackup,
  verifyBackup,
};
