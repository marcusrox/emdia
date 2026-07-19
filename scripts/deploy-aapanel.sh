#!/usr/bin/env bash

set -Eeuo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

APP_DIR="/www/wwwroot/emdia/emdia"
BRANCH="master"
PROJECT_NAME="emdia"
APP_USER="www"
PM2_BIN="/usr/bin/pm2"
HEALTH_URL="http://127.0.0.1:3000/ready"
COMMIT_FILE="$APP_DIR/.deploy-commit"
COMMIT_TEMP="$APP_DIR/.deploy-commit.tmp.$$"
LOCK_FILE="/var/lock/emdia-deploy.lock"
REQUIRED_NODE_MAJOR=24
REQUIRED_NODE_MINOR=15

trap 'rm -f "$COMMIT_TEMP"' EXIT

validate_node_version() {
  local label="$1"
  local raw_version="$2"
  local version="${raw_version#v}"
  local major
  local minor
  local patch

  IFS="." read -r major minor patch <<< "$version"

  if [[ ! "$major" =~ ^[0-9]+$ ]] || [[ ! "$minor" =~ ^[0-9]+$ ]] || [[ ! "$patch" =~ ^[0-9]+$ ]]; then
    echo "$label possui formato inválido: $raw_version" >&2
    exit 1
  fi

  if (( major != REQUIRED_NODE_MAJOR || minor < REQUIRED_NODE_MINOR )); then
    echo "$label incompatível: $raw_version. Esperado: >=24.15.0 <25." >&2
    exit 1
  fi

  echo "$label validado: $raw_version"
}

validate_pm2_runtime() {
  local project_pid
  local node_binary
  local node_version

  project_pid="$(runuser -u "$APP_USER" -- "$PM2_BIN" pid "$PROJECT_NAME")"
  if [[ ! "$project_pid" =~ ^[1-9][0-9]*$ ]] || [[ ! -e "/proc/$project_pid/exe" ]]; then
    echo "Não foi possível localizar o processo $PROJECT_NAME no PM2 do usuário $APP_USER." >&2
    exit 1
  fi

  node_binary="$(readlink -f "/proc/$project_pid/exe")"
  node_version="$("$node_binary" --version)"
  validate_node_version "Node.js do processo PM2" "$node_version"
}

if [[ "$EUID" -ne 0 ]]; then
  echo "O deploy deve ser executado como root pelo WebHook do aaPanel." >&2
  exit 1
fi

for command_name in curl flock git node npm readlink runuser; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Comando obrigatório não encontrado: $command_name" >&2
    exit 1
  fi
done

if [[ ! -x "$PM2_BIN" ]]; then
  echo "PM2 não encontrado em $PM2_BIN." >&2
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Já existe um deploy do EmDia em execução." >&2
  exit 1
fi

echo "Iniciando deploy do EmDia..."
echo "Executor: $(id -un)"

validate_node_version "Node.js do WebHook" "$(node --version)"
validate_pm2_runtime

cd "$APP_DIR"

git config core.filemode false

if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  echo "A branch ativa deve ser $BRANCH." >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "O checkout possui alterações locais e o deploy foi interrompido." >&2
  git status --short >&2
  exit 1
fi

git fetch --prune origin "$BRANCH"
git merge --ff-only "origin/$BRANCH"

npm ci --omit=dev

echo "Reiniciando $PROJECT_NAME no PM2 do usuário $APP_USER..."
runuser -u "$APP_USER" -- "$PM2_BIN" restart "$PROJECT_NAME" --update-env
validate_pm2_runtime

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent "$HEALTH_URL" >/dev/null; then
    published_commit="$(git rev-parse HEAD)"

    printf 'Commit publicado: %s\n' "$published_commit" > "$COMMIT_TEMP"
    chown "$APP_USER:$APP_USER" "$COMMIT_TEMP"
    chmod 0644 "$COMMIT_TEMP"
    mv -f "$COMMIT_TEMP" "$COMMIT_FILE"

    echo "Deploy concluído e aplicação saudável."
    echo "Commit publicado: $published_commit"
    exit 0
  fi

  echo "Aguardando aplicação iniciar: tentativa $attempt/10"
  sleep 2
done

echo "A aplicação não respondeu ao health check." >&2
exit 1
