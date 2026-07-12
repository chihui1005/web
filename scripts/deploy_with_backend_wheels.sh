#!/usr/bin/env bash

set -euo pipefail

if [[ ${EUID} -eq 0 && -n ${SUDO_USER:-} && ${SUDO_USER} != "root" && -z ${PIKACHU_SHOP_REEXEC_AS_USER:-} ]]; then
  exec sudo -u "$SUDO_USER" -E env PIKACHU_SHOP_REEXEC_AS_USER=1 bash "$0" "$@"
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://mirrors.cloud.tencent.com/pypi/simple}"
PIP_TRUSTED_HOST="${PIP_TRUSTED_HOST:-mirrors.cloud.tencent.com}"
BACKEND_WHEEL_PYTHON_VERSION="${BACKEND_WHEEL_PYTHON_VERSION:-3.12}"
BACKEND_WHEEL_ABI="cp${BACKEND_WHEEL_PYTHON_VERSION/./}"

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose v2 is required. Install the Compose v2 plugin, then rerun this script." >&2
  exit 1
fi

cleanup_legacy_containers() {
  local legacy_names=(
    "pikachu-shop-backend"
    "pikachu-shop-frontend"
    "1529a1f2039d_pikachu-shop-backend"
    "1529a1f2039d_pikachu-shop-frontend"
  )

  for name in "${legacy_names[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -Fxq "$name"; then
      docker rm -f "$name" >/dev/null
    fi
  done
}

cd "$ROOT_DIR"

if python3 -m pip --version >/dev/null 2>&1; then
  PIP_CMD=(python3 -m pip)
elif [[ -x backend/.venv/bin/python ]] && backend/.venv/bin/python -m pip --version >/dev/null 2>&1; then
  PIP_CMD=(backend/.venv/bin/python -m pip)
else
  echo "A working pip is required. Install python3-pip or ensure backend/.venv has pip available, then rerun this script." >&2
  exit 1
fi

mkdir -p backend/wheels
find backend/wheels -mindepth 1 ! -name '.gitkeep' -delete

"${PIP_CMD[@]}" download \
  -d backend/wheels \
  -r backend/requirements.txt \
  --only-binary=:all: \
  --implementation cp \
  --python-version "$BACKEND_WHEEL_PYTHON_VERSION" \
  --abi "$BACKEND_WHEEL_ABI" \
  -i "$PIP_INDEX_URL" \
  --trusted-host "$PIP_TRUSTED_HOST"

cleanup_legacy_containers
docker compose down --remove-orphans >/dev/null 2>&1 || true
docker compose build --no-cache && docker compose up -d --remove-orphans