#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://mirrors.cloud.tencent.com/pypi/simple}"
PIP_TRUSTED_HOST="${PIP_TRUSTED_HOST:-mirrors.cloud.tencent.com}"

cd "$ROOT_DIR"

mkdir -p backend/wheels

python3 -m pip download \
  -d backend/wheels \
  -r backend/requirements.txt \
  -i "$PIP_INDEX_URL" \
  --trusted-host "$PIP_TRUSTED_HOST"

docker-compose build --no-cache && docker-compose up -d