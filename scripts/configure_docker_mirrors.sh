#!/usr/bin/env bash

set -euo pipefail

sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://docker.nju.edu.cn",
    "https://docker.1ms.run",
    "https://dockerproxy.net",
    "https://dockerproxy.com",
    "https://dockerproxy.link",
    "https://proxy.vvvv.ee"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
docker info | grep -A10 'Registry Mirrors'