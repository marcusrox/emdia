const activeTransactions = new WeakSet();

function withTransaction(db, callback) {
  return executeTransaction(db, callback, "BEGIN");
}

function withImmediateTransaction(db, callback) {
  return executeTransaction(db, callback, "BEGIN IMMEDIATE");
}

function executeTransaction(db, callback, beginStatement) {
  validateArguments(db, callback);

  if (activeTransactions.has(db) || db.isTransaction) {
    const error = new Error("Transações SQLite aninhadas não são suportadas nesta conexão.");
    error.code = "SQLITE_NESTED_TRANSACTION";
    throw error;
  }

  let began = false;
  let committed = false;
  activeTransactions.add(db);

  try {
    db.exec(beginStatement);
    began = true;

    const result = callback(db);
    if (result && typeof result.then === "function") {
      throw new TypeError("O callback transacional deve ser síncrono.");
    }

    db.exec("COMMIT");
    committed = true;
    return result;
  } catch (error) {
    if (began && !committed) {
      rollbackPreservingOriginalError(db, error);
    }
    throw error;
  } finally {
    activeTransactions.delete(db);
  }
}

function validateArguments(db, callback) {
  if (!db || typeof db !== "object" || typeof db.exec !== "function") {
    throw new TypeError("Informe uma conexão SQLite válida.");
  }
  if (typeof callback !== "function") {
    throw new TypeError("Informe um callback transacional.");
  }
}

function rollbackPreservingOriginalError(db, originalError) {
  try {
    db.exec("ROLLBACK");
  } catch (rollbackError) {
    try {
      if (originalError && typeof originalError === "object" && Object.isExtensible(originalError)) {
        Object.defineProperty(originalError, "rollbackError", {
          configurable: true,
          value: rollbackError,
        });
      }
    } catch {
      // A falha ao anexar diagnóstico também não pode mascarar a causa original.
    }
  }
}

module.exports = {
  withImmediateTransaction,
  withTransaction,
};
