const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const sourceDirectories = [
  "scripts",
  "src",
  path.join("public", "js"),
  "test",
];
const ignoredDirectories = new Set([
  ".git",
  "data",
  "log",
  "logs",
  "node_modules",
]);

const files = [
  ...rootJavaScriptFiles(),
  ...sourceDirectories.flatMap((directory) => collectJavaScriptFiles(path.join(projectRoot, directory))),
].sort((left, right) => left.localeCompare(right));

const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  if (result.status === 0) continue;

  failures.push({
    file: path.relative(projectRoot, file),
    output: String(result.stderr || result.stdout || result.error?.message || "Falha sem detalhes.").trim(),
  });
}

if (failures.length) {
  console.error(`Falha na validação sintática de ${failures.length} arquivo(s):`);
  for (const failure of failures) {
    console.error(`\n- ${failure.file}\n${failure.output}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Validação sintática concluída: ${files.length} arquivo(s) JavaScript.`);
}

function rootJavaScriptFiles() {
  return fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(projectRoot, entry.name));
}

function collectJavaScriptFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectJavaScriptFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });
}
