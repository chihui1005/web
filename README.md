# Pikachu Shop MVP

目录结构：

- `frontend/`: React + Vite 商城前端
- `backend/`: FastAPI + SQLAlchemy + SQLite 后端

## 本地开发

前端开发命令仍在仓库根目录执行：

```bash
npm install
npm run dev:frontend
```

如需修改后端地址，可复制 `frontend/.env.example` 为 `frontend/.env`。

后端建议使用 Python 3.12+：

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Docker 部署

这套项目已经补齐 Docker 配置，适合在本地和云主机上保持一致环境。

如果云主机访问 Python 包索引不稳定，推荐先在宿主机预下载后端依赖，再让 Docker 离线安装。

如果服务器拉取 Docker 基础镜像较慢，建议先给 Docker daemon 配置镜像加速，再执行下面的构建命令。

如果服务器上还没有 `docker compose` 命令，建议直接安装 Docker Compose v2 插件；不要求先卸载旧的 `docker-compose` v1，只要后续统一使用 `docker compose` 即可：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker compose version
```

如果当前用户还没有 Docker 权限，再执行：

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker info
```

仓库内已经提供配置脚本：

```bash
./scripts/configure_docker_mirrors.sh
```

它会写入以下 `registry-mirrors` 配置：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
	"registry-mirrors": [
		"https://docker.1ms.run",
		"https://dockerproxy.net",
		"https://dockerproxy.com",
		"https://dockerproxy.link",
		"https://proxy.vvvv.ee",
		"https://docker.nju.edu.cn"
	]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
docker info | grep -A10 'Registry Mirrors'
```

说明：这个顺序已经按当前主机的实测结果调整过。`docker.mirrors.ustc.edu.cn` 已因 DNS 无法解析移除；`docker.1ms.run` 对 `/v2/` 返回了更符合 Registry 预期的 `401`，因此放在首位；`docker.nju.edu.cn` 当前可连通但返回 `403`，先保留在后面作为兜底。若其中某个源长期较慢，可继续按实际情况收缩镜像源列表。

### 启动方式

在仓库根目录执行：

```bash
docker compose up -d --build
```

在中国网络环境下，更推荐执行下面这条脚本命令：

```bash
./scripts/deploy_with_backend_wheels.sh
```

它会自动执行以下步骤：

```bash
mkdir -p backend/wheels
python3 -m pip download -d backend/wheels -r backend/requirements.txt -i https://mirrors.cloud.tencent.com/pypi/simple --trusted-host mirrors.cloud.tencent.com
docker compose build --no-cache && docker compose up -d
```

前端 Docker 构建默认使用腾讯云 npm 镜像：`https://mirrors.cloud.tencent.com/npm/`。
如果该源在当前主机上较慢，可以临时覆盖，例如：

```bash
NPM_REGISTRY=https://registry.npmmirror.com docker compose build --no-cache frontend
NPM_REGISTRY=https://npm.aliyun.com docker compose build --no-cache frontend
NPM_REGISTRY=https://mirrors.huaweicloud.com/repository/npm/ docker compose build --no-cache frontend
```

访问地址：

- 前端：`http://<你的服务器IP>:8080/`
- 后端健康检查：`http://<你的服务器IP>:8080/api/health`

默认把前端发布到宿主机 `8080` 端口，避免和服务器上已有的 Nginx、Apache 或其他服务抢占 `80` 端口。如果确认服务器 `80` 端口空闲，也可以这样启动：

```bash
FRONTEND_HOST_PORT=80 docker compose up -d --build
```

### 关闭服务

```bash
docker compose down
```

### 清空并重建数据库卷

```bash
docker compose down -v
docker compose up -d --build
```

### 数据持久化

SQLite 数据通过 Docker volume `backend_data` 持久化，不依赖宿主机 Python 虚拟环境。

### 生产环境建议

启动前设置后端密钥环境变量：

```bash
export PIKACHU_SHOP_SECRET='replace-with-a-long-random-secret'
./scripts/deploy_with_backend_wheels.sh
```

## 默认测试账号

- 用户名：`ash`
- 密码：`pikachu123`
- 用户名：`misty`
- 密码：`togepi123`

后端首次启动会自动初始化 SQLite 数据库并写入示例商品与测试用户。

## 已实现能力

- 用户名密码登录
- 商品列表接口
- 按用户持久化购物车
- 下单生成订单记录
- 订单列表查询
