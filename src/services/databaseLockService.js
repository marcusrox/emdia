const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");

function acquireDatabaseLock(databasePath, { owner = "application" } = {}) {
  const resolvedDatabasePath = normalizeDatabasePath(databasePath);
  const lockPath = `${resolvedDatabasePath}.emdia.lock`;
  const token = randomBytes(12).toString("hex");

  fs.mkdirSync(path.dirname(resolvedDatabasePath), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = fs.openSync(lockPath, "wx", 0o600);
      let writeError = null;
      try {
        fs.writeFileSync(
          descriptor,
          `${JSON.stringify({
            pid: process.pid,
            owner: String(owner || "application"),
            started_at: new Date().toISOString(),
            token,
          })}\n`,
          "utf8",
        );
      } catch (error) {
        writeError = error;
      } finally {
        fs.closeSync(descriptor);
      }
      if (writeError) {
        try {
          fs.unlinkSync(lockPath);
        } catch (cleanupError) {
          writeError.cleanupError = cleanupError;
        }
        throw writeError;
      }

      let released = false;
      return {
        lockPath,
        release() {
          if (released) return;
          released = true;
          releaseOwnedLock(lockPath, token);
        },
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;

      const existingLock = readDatabaseLock(lockPath);
      if (!existingLock || isProcessAlive(existingLock.pid)) {
        throw databaseInUseError(existingLock);
      }

      removeStaleLock(lockPath, existingLock);
    }
  }

  throw databaseInUseError(readDatabaseLock(lockPath));
}

function readDatabaseLock(lockPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    return {
      pid: Number(parsed.pid),
      owner: String(parsed.owner || "unknown"),
      started_at: String(parsed.started_at || ""),
      token: String(parsed.token || ""),
    };
  } catch {
    return null;
  }
}

function normalizeDatabasePath(databasePath) {
  const value = String(databasePath || "").trim();
  if (!value || value === ":memory:") {
    throw new Error("O lock operacional exige um banco SQLite persistido em arquivo.");
  }
  return path.resolve(value);
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return true;

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

function removeStaleLock(lockPath, expectedLock) {
  const currentLock = readDatabaseLock(lockPath);
  if (!currentLock || currentLock.token !== expectedLock.token) {
    throw databaseInUseError(currentLock);
  }

  try {
    fs.unlinkSync(lockPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function releaseOwnedLock(lockPath, token) {
  const currentLock = readDatabaseLock(lockPath);
  if (!currentLock || currentLock.token !== token) return;

  try {
    fs.unlinkSync(lockPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function databaseInUseError(lock) {
  const error = new Error(
    lock
      ? `O banco está em uso pelo processo ${lock.pid} (${lock.owner}). Encerre a aplicação antes de restaurar.`
      : "O banco possui um lock operacional inválido. Verifique se a aplicação está encerrada antes de removê-lo.",
  );
  error.code = "EMDIA_DATABASE_IN_USE";
  return error;
}

module.exports = {
  acquireDatabaseLock,
  readDatabaseLock,
};
