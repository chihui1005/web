# Pikachu Shop MVP

目录结构：

- `frontend/`: React + Vite 商城前端
- `backend/`: FastAPI + SQLAlchemy + SQLite 后端

## 前端

前端开发命令仍在仓库根目录执行：

```bash
npm install
npm run dev:frontend
```

如需修改后端地址，可复制 `frontend/.env.example` 为 `frontend/.env`。

## 后端

目标 Python 版本：3.13。

建议在服务器或本地完整环境中执行：

```bash
cd backend
python3.13 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

默认测试账号：

- 用户名：`ash`
- 密码：`pikachu123`

后端首次启动会自动初始化 SQLite 数据库并写入示例商品与测试用户。

## 已实现能力

- 用户名密码登录
- 商品列表接口
- 按用户持久化购物车
- 下单生成订单记录
- 订单列表查询

## 当前环境说明

当前工作区终端缺少可用的 Node 运行环境，并且 Python 环境缺少 `pip` / `venv` 支持，因此这里无法在本地完整跑通前后端服务；代码已完成静态校验与 Python 语法编译校验。
