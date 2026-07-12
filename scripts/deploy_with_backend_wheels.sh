#!/usr/bin/env bash

set -euo pipefail

if [[ ${EUID} -eq 0 && -n ${SUDO_USER:-} && ${SUDO_USER} != "root" ]]; then
  RUN_AS_USER=(sudo -u "$SUDO_USER" -H)
else
  RUN_AS_USER=()
fi

resolve_docker_bin() {
  if [[ ${#RUN_AS_USER[@]} -gt 0 ]]; then
    "${RUN_AS_USER[@]}" bash -lc 'command -v docker || true'
  else
    command -v docker || true
  fi
}

run_in_target_user() {
  if [[ ${#RUN_AS_USER[@]} -gt 0 ]]; then
    "${RUN_AS_USER[@]}" "$@"
  else
    "$@"
  fi
}

DOCKER_BIN="${DOCKER_BIN:-$(resolve_docker_bin)}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://mirrors.cloud.tencent.com/pypi/simple}"
PIP_TRUSTED_HOST="${PIP_TRUSTED_HOST:-mirrors.cloud.tencent.com}"
BACKEND_WHEEL_PYTHON_VERSION="${BACKEND_WHEEL_PYTHON_VERSION:-3.12}"
BACKEND_WHEEL_ABI="cp${BACKEND_WHEEL_PYTHON_VERSION/./}"

if [[ -z "$DOCKER_BIN" ]]; then
  echo "docker command not found. Ensure Docker is installed and available in PATH, then rerun this script." >&2
  exit 1
fi

if ! run_in_target_user "$DOCKER_BIN" compose version >/dev/null 2>&1; then
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
    if run_in_target_user "$DOCKER_BIN" ps -a --format '{{.Names}}' | grep -Fxq "$name"; then
      run_in_target_user "$DOCKER_BIN" rm -f "$name" >/dev/null
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

run_in_target_user "${PIP_CMD[@]}" download \
  -d backend/wheels \
  -r backend/requirements.txt \
  --only-binary=:all: \
  --implementation cp \
  --python-version "$BACKEND_WHEEL_PYTHON_VERSION" \
  --abi "$BACKEND_WHEEL_ABI" \
  -i "$PIP_INDEX_URL" \
  --trusted-host "$PIP_TRUSTED_HOST"

cleanup_legacy_containers
run_in_target_user "$DOCKER_BIN" compose down --remove-orphans >/dev/null 2>&1 || true
run_in_target_user "$DOCKER_BIN" compose build --no-cache && run_in_target_user "$DOCKER_BIN" compose up -d --remove-orphans