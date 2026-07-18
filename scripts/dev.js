const { spawn } = require("node:child_process");

const port = parsePort(process.env.PORT);
const url = `http://localhost:${port}`;

const server = spawn(
  process.execPath,
  ["--disable-warning=ExperimentalWarning", "--watch", "--watch-preserve-output", "app.js"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(port),
    },
    stdio: "inherit",
  },
);

server.on("error", (error) => {
  console.error(`Falha ao iniciar o servidor de desenvolvimento: ${error.message}`);
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  if (signal) {
    return;
  }

  process.exitCode = code ?? 1;
});

waitForServer(`${url}/health`)
  .then(() => openBrowser(url))
  .catch((error) => {
    if (!server.killed) {
      console.error(`Navegador não aberto: ${error.message}`);
    }
  });

process.on("SIGINT", () => stopServer("SIGINT"));
process.on("SIGTERM", () => stopServer("SIGTERM"));

function parsePort(value) {
  const parsed = Number(value || 3000);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error("PORT deve ser um número inteiro entre 1 e 65535.");
  }

  return parsed;
}

async function waitForServer(healthUrl) {
  const maximumAttempts = 60;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    if (server.exitCode !== null || server.killed) {
      throw new Error("o servidor foi encerrado antes de ficar disponível.");
    }

    try {
      const response = await fetch(healthUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // O servidor ainda está inicializando.
    }

    await delay(500);
  }

  throw new Error(`o servidor não respondeu em ${healthUrl} dentro de 30 segundos.`);
}

function openBrowser(targetUrl) {
  const commands = {
    darwin: { command: "open", args: [targetUrl] },
    linux: { command: "xdg-open", args: [targetUrl] },
    win32: { command: "explorer.exe", args: [targetUrl] },
  };
  const browser = commands[process.platform];

  if (!browser) {
    throw new Error(`sistema operacional não suportado (${process.platform}). Acesse ${targetUrl}.`);
  }

  const opener = spawn(browser.command, browser.args, {
    detached: true,
    stdio: "ignore",
  });

  opener.on("error", (error) => {
    console.error(`Não foi possível abrir ${targetUrl}: ${error.message}`);
  });
  opener.unref();
}

function stopServer(signal) {
  if (server.exitCode === null && !server.killed) {
    server.kill(signal);
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
