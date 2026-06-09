# 接码平台 V2

这是一个 TypeScript 实现的接码平台单体项目，包含 Node.js 后端 API、SQLite 本地存储、Provider 适配层，以及 React/Vite 前端管理界面。

## 功能概览

- 兑换码接码流程：用户提交兑换码后创建接码任务。
- 任务状态管理：查询任务、等待短信、取消任务、完成任务。
- 历史记录：查看接码任务列表和任务详情。
- 后台管理：管理兑换码和短信 Provider 配置。
- Provider 适配：当前包含 `MockProviderAdapter`，后续可按统一接口扩展真实供应商。

## 技术栈

- 后端：Node.js、Express 5、TypeScript、better-sqlite3
- 前端：React 19、React Router 7、Vite
- 配置：dotenv
- 构建：TypeScript Compiler、Vite

## 目录结构

```text
src/
  application/      # 业务用例
  domain/           # 领域类型、状态、错误
  infrastructure/   # 配置、日志、安全、SQLite 存储
  interfaces/       # HTTP 中间件与路由
  providers/        # Provider 抽象和适配器
  scheduler/        # 接码轮询任务
  shared/           # 通用响应结构
web/src/
  app/              # 前端路由与应用入口
  pages/            # 页面组件
  services/         # API 客户端
  types/            # 前端类型
  utils/            # 工具函数
docs/               # 需求、架构、数据库、API 文档
data/               # 本地 SQLite 数据
```

## 环境配置

复制 `.env.example` 为 `.env`，再按本地环境调整：

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
DATABASE_PATH=./data/sms-code.sqlite
SECURITY_KEY=replace-with-local-security-key
ADMIN_TOKEN=replace-with-local-admin-token
```

| 参数 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 后端 API 监听端口。 |
| `NODE_ENV` | `development` | 运行环境标识。 |
| `LOG_LEVEL` | `info` | 日志级别标识。 |
| `DATABASE_PATH` | `./data/sms-code.sqlite` | SQLite 数据库文件路径，目录会在本地运行时使用。 |
| `SECURITY_KEY` | `development-only-security-key` | 安全字段处理使用的密钥，本地和部署环境应显式配置。 |
| `ADMIN_TOKEN` | `development-only-admin-token` | 后台接口鉴权 Token，请求时使用 `Authorization: Bearer <ADMIN_TOKEN>` 或 `x-admin-token`。 |

`SECURITY_KEY` 和 `ADMIN_TOKEN` 在代码中有开发默认值，但本地调试和部署都应显式配置。不要提交 `.env`、真实密钥或本地数据库文件。

## 本地开发

安装依赖：

```bash
npm install
```

启动后端 API：

```bash
npm run dev
```

启动前端开发服务：

```bash
npm run dev:web
```

前端默认由 Vite 提供开发服务；后端默认监听 `PORT`，未配置时为 `3000`。

## 构建与运行

构建后端：

```bash
npm run build
```

构建前端：

```bash
npm run build:web
```

运行已编译后端：

```bash
npm start
```

当前 `package.json` 未配置 `test` 或 `lint` 脚本。

## 服务器部署

项目支持通过 GitHub Actions 自动构建 Docker 镜像并推送到 GitHub Container Registry（GHCR）。镜像内包含后端 API 和前端静态资源，服务器只需要拉取镜像并运行容器。

### 发布镜像

当前发布流程由 `.github/workflows/docker.yml` 控制：

- 推送到 `build` 分支时自动构建并发布镜像。
- 也可以在 GitHub Actions 页面手动触发发布。
- 镜像地址格式为：

```text
ghcr.io/<owner>/<repo>:latest
ghcr.io/<owner>/<repo>:<commit-sha>
```

推荐发布流程：

```bash
git checkout build
git merge main
git push origin build
```

第一次发布成功后，GHCR 会自动创建对应的 package，通常不需要提前手动创建。

### 服务器拉取镜像

如果仓库或 GHCR package 是私有的，服务器需要先登录 GHCR：

```bash
docker login ghcr.io
```

用户名使用 GitHub 用户名，密码使用 GitHub Personal Access Token，Token 至少需要 `read:packages` 权限。

拉取镜像：

```bash
docker pull ghcr.io/<owner>/<repo>:latest
```

### 运行容器

```bash
docker run -d \
  --name sms-code \
  -p 3000:3000 \
  -e SECURITY_KEY="replace-with-production-security-key" \
  -e ADMIN_TOKEN="replace-with-production-admin-token" \
  -e DATABASE_PATH="/app/data/sms-code.sqlite" \
  -v sms-code-data:/app/data \
  ghcr.io/<owner>/<repo>:latest
```

部署后访问：

```text
http://<server-ip>:3000
http://<server-ip>:3000/api/v2/health
```

### 更新部署

发布新镜像后，在服务器执行：

```bash
docker pull ghcr.io/<owner>/<repo>:latest
docker stop sms-code
docker rm sms-code
docker run -d \
  --name sms-code \
  -p 3000:3000 \
  -e SECURITY_KEY="replace-with-production-security-key" \
  -e ADMIN_TOKEN="replace-with-production-admin-token" \
  -e DATABASE_PATH="/app/data/sms-code.sqlite" \
  -v sms-code-data:/app/data \
  ghcr.io/<owner>/<repo>:latest
```

### 部署注意事项

- `SECURITY_KEY` 和 `ADMIN_TOKEN` 必须在部署时显式配置，不要使用开发默认值。
- SQLite 数据库必须挂载到 `/app/data`，否则删除容器后会丢失数据。
- `latest` 适合简单部署；如果需要可回滚部署，建议使用 `<commit-sha>` 标签运行指定版本。
- 如果 GitHub Actions 推送镜像失败，检查仓库的 Actions 权限是否允许 `packages: write`。

## 前端页面

- `/redeem`：兑换码接码入口。
- `/tasks/:taskId`：接码任务详情和状态操作。
- `/history`：历史任务列表。
- `/history/:taskId`：历史任务详情。
- `/admin/redeem-codes`：兑换码后台管理。
- `/admin/providers`：Provider 配置管理。

## API 概览

所有接口统一挂载在 `/api/v2` 下。

公开接口：

- `GET /api/v2/health`
- `POST /api/v2/redeem-codes/redeem`
- `GET /api/v2/sms-tasks/:taskId`
- `POST /api/v2/sms-tasks/:taskId/wait-code`
- `POST /api/v2/sms-tasks/:taskId/cancel`
- `POST /api/v2/sms-tasks/:taskId/complete`
- `GET /api/v2/sms-task-history`
- `GET /api/v2/sms-task-history/:taskId`

后台接口需要携带 `Authorization: Bearer <ADMIN_TOKEN>` 或 `x-admin-token: <ADMIN_TOKEN>`：

- `GET /api/v2/admin/redeem-codes`
- `POST /api/v2/admin/redeem-codes`
- `PATCH /api/v2/admin/redeem-codes/:id`
- `POST /api/v2/admin/redeem-codes/:id/disable`
- `GET /api/v2/admin/providers`
- `POST /api/v2/admin/providers`
- `PATCH /api/v2/admin/providers/:id`
- `POST /api/v2/admin/providers/:id/disable`

## 开发注意事项

- 后端使用 `moduleResolution: NodeNext`，本地 TypeScript 导入路径需要写 `.js` 扩展名。
- SQLite 文件位于 `DATABASE_PATH`，默认 `./data/sms-code.sqlite`。
- `dist/`、`dist-web/` 和本地数据库文件是生成或运行产物，不应手工维护。
- 新增 Provider 时优先实现 `providers/base/ProviderAdapter.ts` 中的约定，并在入口统一注册。
