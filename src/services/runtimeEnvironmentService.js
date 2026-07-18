const os = require("node:os");
const path = require("node:path");
const packageJson = require("../../package.json");
const packageLock = require("../../package-lock.json");
const { RELEASE_LABEL } = require("../config/release");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SAFE_ENV_VALUES = new Set([
  "NODE_ENV",
  "PORT",
  "APP_BASE_URL",
  "TZ",
  "WHATSAPP_PROVIDER",
  "EVOLUTION_REQUEST_TIMEOUT_MS",
  "WAHA_REQUEST_TIMEOUT_MS",
  "WHATSAPP_NOTIFICATION_INTERVAL_MS",
  "WHATSAPP_NOTIFICATIONS_DISABLED",
]);
const ENV_ALLOWLIST = [
  "NODE_ENV",
  "PORT",
  "APP_BASE_URL",
  "TZ",
  "EMDIA_DEFAULT_PASSWORD",
  "EMDIA_DB_PATH",
  "WHATSAPP_PROVIDER",
  "EVOLUTION_API_BASE_URL",
  "EVOLUTION_API_KEY",
  "EVOLUTION_INSTANCE_NAME",
  "EVOLUTION_REQUEST_TIMEOUT_MS",
  "WAHA_API_BASE_URL",
  "WAHA_API_KEY",
  "WAHA_SESSION",
  "WAHA_REQUEST_TIMEOUT_MS",
  "WHATSAPP_NOTIFICATION_INTERVAL_MS",
  "WHATSAPP_NOTIFICATIONS_DISABLED",
];
const SENSITIVE_ENV_PATTERN = /(PASSWORD|PASS|TOKEN|SECRET|KEY|COOKIE|SESSION|AUTH|CREDENTIAL|WEBHOOK|URL|PATH)/i;

function collectRuntimeEnvironment(user = {}) {
  const memory = process.memoryUsage();

  return {
    collectedAt: new Date().toISOString(),
    summary: [
      summaryItem("Release", RELEASE_LABEL, "badge-check", "primary"),
      summaryItem("Node.js", process.version, "hexagon", "blue"),
      summaryItem("Sistema", `${os.type()} ${os.release()}`, "monitor-cog", "violet"),
      summaryItem("Tempo ativo", formatDuration(process.uptime()), "timer", "amber"),
    ],
    application: [
      detail("Nome", packageJson.name || "EmDia"),
      detail("Versão do pacote", packageJson.version || "Não informada", true),
      detail("Release", RELEASE_LABEL),
      detail("Ambiente lógico", safeEnvironmentValue("NODE_ENV", "production")),
      detail("Coletado em", formatDateTime(new Date(), user.timezone)),
    ],
    operatingSystem: [
      detail("Plataforma", process.platform, true),
      detail("Tipo", os.type()),
      detail("Release", os.release(), true),
      detail("Arquitetura", process.arch, true),
      detail("CPUs disponíveis", String(os.cpus().length)),
      detail("Memória total", formatBytes(os.totalmem())),
      detail("Memória livre", formatBytes(os.freemem())),
      detail("Identificação do host", "Omitida por segurança"),
    ],
    process: [
      detail("Versão do Node.js", process.version, true),
      detail("V8", process.versions.v8, true),
      detail("SQLite", process.versions.sqlite || "Não informado", true),
      detail("OpenSSL", process.versions.openssl || "Não informado", true),
      detail("PID", String(process.pid), true),
      detail("Tempo de atividade", formatDuration(process.uptime())),
      detail("Memória RSS", formatBytes(memory.rss)),
      detail("Heap utilizado", formatBytes(memory.heapUsed)),
      detail("Heap total", formatBytes(memory.heapTotal)),
      detail("Entrada", safeProcessEntry()),
    ],
    installedModules: collectInstalledModules(),
    loadedModules: collectLoadedModules(),
    environmentVariables: collectEnvironmentVariables(),
    configurations: collectConfigurations(user),
  };
}

function collectInstalledModules() {
  const dependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.optionalDependencies || {}),
  };
  const optional = new Set(Object.keys(packageJson.optionalDependencies || {}));

  return Object.entries(dependencies)
    .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
    .map(([name, declaredVersion]) => {
      const resolvedVersion = packageLock.packages?.[`node_modules/${name}`]?.version || "";
      const state = resolvedVersion ? "Resolvido" : optional.has(name) ? "Opcional ausente" : "Não resolvido";

      return {
        name,
        declaredVersion,
        resolvedVersion: resolvedVersion || "—",
        state,
        tone: resolvedVersion ? "success" : optional.has(name) ? "neutral" : "warning",
      };
    });
}

function collectLoadedModules() {
  const projectModules = new Set();
  const externalModules = new Set();

  Object.keys(require.cache).forEach((filePath) => {
    const resolved = path.resolve(filePath);
    const packageName = packageNameFromPath(resolved);

    if (packageName) {
      externalModules.add(packageName);
      return;
    }

    const relative = path.relative(PROJECT_ROOT, resolved);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      projectModules.add(relative.split(path.sep).join("/"));
    }
  });

  return {
    project: [...projectModules].sort((left, right) => left.localeCompare(right, "pt-BR")),
    external: [...externalModules].sort((left, right) => left.localeCompare(right, "pt-BR")),
  };
}

function packageNameFromPath(filePath) {
  const parts = filePath.split(path.sep);
  const nodeModulesIndex = parts.lastIndexOf("node_modules");
  if (nodeModulesIndex === -1 || !parts[nodeModulesIndex + 1]) return "";

  const first = parts[nodeModulesIndex + 1];
  return first.startsWith("@") && parts[nodeModulesIndex + 2]
    ? `${first}/${parts[nodeModulesIndex + 2]}`
    : first;
}

function collectEnvironmentVariables() {
  return ENV_ALLOWLIST.map((name) => {
    const configured = process.env[name] !== undefined && String(process.env[name]).length > 0;
    const sensitive = SENSITIVE_ENV_PATTERN.test(name) || !SAFE_ENV_VALUES.has(name);

    return {
      name,
      state: configured ? sensitive ? "Mascarado" : "Configurada" : "Não configurada",
      value: configured && !sensitive ? String(process.env[name]) : "—",
      tone: configured ? sensitive ? "masked" : "success" : "neutral",
    };
  });
}

function collectConfigurations(user) {
  const provider = safeEnvironmentValue("WHATSAPP_PROVIDER", "mock");
  const providerState = notificationProviderState(provider);

  return [
    configuration("Porta HTTP", safeEnvironmentValue("PORT", "3000"), "server"),
    configuration("URL pública", process.env.APP_BASE_URL ? "Configurada" : "Não configurada", "globe-2"),
    configuration("Fuso horário do usuário", user.timezone || "America/Sao_Paulo", "clock-3"),
    configuration("Locale da interface", user.locale || "pt-BR", "languages"),
    configuration("Persistência", "SQLite local", "database"),
    configuration("Banco de dados", process.env.EMDIA_DB_PATH ? "Caminho personalizado configurado" : "Caminho local padrão", "hard-drive"),
    configuration("Provedor de notificações", provider, "message-circle", providerState),
    configuration("Agendador de notificações", process.env.WHATSAPP_NOTIFICATIONS_DISABLED === "1" ? "Desabilitado" : "Habilitado", "bell"),
    configuration("Logs operacionais", "log/", "file-text"),
    configuration("Competência padrão", "Mês corrente do usuário", "calendar-days"),
  ];
}

function notificationProviderState(provider) {
  if (provider === "mock") return "Simulado";
  if (provider === "evolution-api") {
    return hasAllEnvironmentVariables(["EVOLUTION_API_BASE_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE_NAME"])
      ? "Configurado"
      : "Incompleto";
  }
  if (provider === "waha") {
    return hasAllEnvironmentVariables(["WAHA_API_BASE_URL", "WAHA_API_KEY", "WAHA_SESSION"])
      ? "Configurado"
      : "Incompleto";
  }
  return "Não reconhecido";
}

function hasAllEnvironmentVariables(names) {
  return names.every((name) => Boolean(process.env[name]));
}

function safeEnvironmentValue(name, fallback) {
  return SAFE_ENV_VALUES.has(name) && process.env[name] ? String(process.env[name]) : fallback;
}

function safeProcessEntry() {
  const entry = process.argv[1];
  return entry ? path.basename(entry) : "Não informado";
}

function summaryItem(label, value, icon, tone) {
  return { label, value, icon, tone };
}

function detail(label, value, mono = false) {
  return { label, value, mono };
}

function configuration(label, value, icon, state = "") {
  return { label, value, icon, state };
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let amount = bytes / 1024;
  let unit = units[0];

  for (let index = 1; index < units.length && amount >= 1024; index += 1) {
    amount /= 1024;
    unit = units[index];
  }

  return `${amount.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(Math.floor(Number(seconds) || 0), 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}min`].filter(Boolean).join(" ");
}

function formatDateTime(date, timezone = "America/Sao_Paulo") {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: timezone || "America/Sao_Paulo",
    }).format(date);
  } catch (error) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  }
}

module.exports = {
  collectRuntimeEnvironment,
  formatBytes,
  formatDuration,
  packageNameFromPath,
};
