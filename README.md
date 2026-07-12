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

### 启动方式

在仓库根目录执行：

```bash
docker compose up -d --build
```

访问地址：

- 前端：`http://<你的服务器IP>/`
- 后端健康检查：`http://<你的服务器IP>/api/health`

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
docker compose up -d --build
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
