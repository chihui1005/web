#!/usr/bin/env bash

set -euo pipefail

sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://dockerproxy.net",
    "https://proxy.vvvv.ee",
    "https://dockerproxy.link"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
docker info | grep -A10 'Registry Mirrors'