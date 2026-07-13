const { createServer } = require("./src/server");
const { initializeDatabase } = require("./src/database/schema");
const { seedDatabase } = require("./src/database/seed");
const { RELEASE_LABEL } = require("./src/config/release");
const { logError, logInfo } = require("./src/services/operationalLogger");

const port = Number(process.env.PORT || 3000);

logInfo("app.startup.begin", "Inicialização da aplicação iniciada.", {
  details: {
    release: RELEASE_LABEL,
    port,
    entrypoint: "app.js",
    nodeVersion: process.version,
  },
});

let server;

try {
  initializeDatabase();
  logInfo("app.startup.schema_ready", "Schema do banco verificado.");

  logInfo("app.startup.seed_requested", "Seed inicial verificado.");
  seedDatabase();

  const app = createServer();
  server = app.listen(port, () => {
    logInfo("app.startup.http_listening", "Servidor HTTP iniciado.", {
      details: {
        release: RELEASE_LABEL,
        port,
      },
    });
    console.log(`EmDia rodando em http://localhost:${port}`);
  });
} catch (error) {
  logError("app.startup.failed", "Falha crítica durante a inicialização.", {
    details: errorDetails(error),
  });
  throw error;
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  logError("app.process.uncaught_exception", "Exceção não capturada no processo.", {
    details: errorDetails(error),
  });
  console.error(error);
  shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  logError("app.process.unhandled_rejection", "Promise rejeitada sem tratamento.", {
    details: errorDetails(reason),
  });
  console.error(reason);
  shutdown("unhandledRejection", 1);
});

function shutdown(signal, exitCode = 0) {
  logInfo("app.shutdown.requested", "Encerramento da aplicação solicitado.", {
    details: { signal },
  });

  if (!server) {
    logInfo("app.shutdown.completed", "Encerramento da aplicação concluído.", {
      details: { signal },
    });
    process.exit(exitCode);
  }

  server.close((error) => {
    if (error) {
      logError("app.shutdown.failed", "Falha durante o encerramento do servidor HTTP.", {
        details: errorDetails(error),
      });
      process.exit(1);
    }

    logInfo("app.shutdown.http_closed", "Servidor HTTP encerrado.", {
      details: { signal },
    });
    logInfo("app.shutdown.completed", "Encerramento da aplicação concluído.", {
      details: { signal },
    });
    process.exit(exitCode);
  });
}

function errorDetails(error) {
  if (!error || typeof error !== "object") {
    return { message: String(error || "Erro desconhecido") };
  }

  return {
    name: error.name,
    message: error.message,
  };
}
