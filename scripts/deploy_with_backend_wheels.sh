#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://mirrors.cloud.tencent.com/pypi/simple}"
PIP_TRUSTED_HOST="${PIP_TRUSTED_HOST:-mirrors.cloud.tencent.com}"

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

mkdir -p backend/wheels

python3 -m pip download \
  -d backend/wheels \
  -r backend/requirements.txt \
  -i "$PIP_INDEX_URL" \
  --trusted-host "$PIP_TRUSTED_HOST"

cleanup_legacy_containers
docker compose down --remove-orphans >/dev/null 2>&1 || true
docker compose build --no-cache && docker compose up -d --remove-orphans