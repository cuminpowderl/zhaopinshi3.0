# 从零到公网：不依赖某一台电脑

本仓库是 **Next.js 全栈应用**（含 `/api`、Prisma、SQLite）。**GitHub 只存代码**；别人能打开的 `https://……` 地址来自 **Railway / Render** 等平台在云端构建并运行你的镜像。

下面流程可在 **任意能上网的电脑**、或 **GitHub Codespaces**、或 **CI** 上完成；不假定 Windows 盘符或 Cursor 路径。

---

## 你要准备什么

| 东西 | 用途 |
|------|------|
| GitHub 账号 | 托管代码 |
| Railway（或 Render）账号 | 构建 Docker、分配公网域名 |
| 本仓库根目录下的 `Dockerfile` | 平台自动识别并构建 |

**不能**用 GitHub Pages 单独托管：这不是纯静态站。

---

## 第一步：代码放进 GitHub（任意目录、任意系统）

1. 打开 [github.com/new](https://github.com/new)，新建仓库（**Public / Private 自选**），**不要**勾选 Add a README / .gitignore / license（避免首次推送冲突）。
2. **Windows（推荐）**：在仓库根目录（含 `package.json`、`Dockerfile`）打开 PowerShell：

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
   .\scripts\push-to-github.ps1
   ```

   按中文提示输入 GitHub 用户名、仓库名；若认证失败，脚本末尾会说明如何用 **Personal Access Token** 再执行 `git push -u origin main`。

   若仓库名固定为 `zhaopin`，仍可用：`.\scripts\setup-git-zhaopin.ps1 -GitHubUser 你的用户名`（内部转调同一套逻辑）。

3. **macOS / Linux 或习惯手打命令**：在仓库根目录执行：

   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/<你的GitHub用户名>/<仓库名>.git
   git push -u origin main
   ```

   首次 `git push` 时浏览器登录或按提示使用 **Personal Access Token**（GitHub：**Settings → Developer settings → Personal access tokens**）。

---

## 第二步：Railway 从 GitHub 部署（推荐路径）

### 2.1 创建项目并连接仓库

1. 登录 [railway.app](https://railway.app)。
2. **New Project**（新建项目）→ **Deploy from GitHub**（从 GitHub 部署）→ 按提示授权 Railway 读取你的仓库 → 选中 **本仓库**。
3. Railway 检测到根目录 **`Dockerfile`** 后会用 **Docker** 构建；无需再选手动「Node」模板（以 Dockerfile 为准）。

### 2.2 持久化磁盘（必做，否则重启丢库）

SQLite 文件必须落在**持久卷**上，与镜像内默认路径一致：

- 在 Railway 项目里为你的 **Web 服务**添加 **Volume**（卷）。
- **Mount Path（挂载路径）**填：`/data`  
  （与 `Dockerfile` 里 `DATABASE_URL=file:/data/dev.db` 一致。）

若你改成别的挂载路径，必须在平台 **Variables** 里把 `DATABASE_URL` 改成对应的 `file:/你的路径/dev.db`。

### 2.3 环境变量（Variables）

在服务的 **Variables**（变量）里可按需添加：

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | 一般**不必填**：镜像已默认 `file:/data/dev.db`。仅当你改了卷路径时需要改这里。 |
| `CHAOPIN_SHARE_GATE` | 可选，填 `1` 表示开启访客门禁（需有效 `/s/<token>` 邀请 cookie）。 |
| `OPENAI_API_KEY` 等 | 与仓库根目录 `.env.example` 一致，按需填写（OCR、邮件等）。 |

### 2.4 生成公网地址

- 在服务 **Settings** 里找到 **Networking / Generate Domain**（或类似「生成域名」）。
- 部署成功后得到类似 `https://xxxx.up.railway.app` 的地址 —— **这就是「网上的网址」**，与 `http://localhost:3000` 无关。
- 候选人页路径相同：`https://你的域名/candidates`。

### 2.5 首次演示数据（可选）

在 Railway 该服务的 **Shell**（或 **Execute** / 一次性命令）里执行：

```bash
npm run db:seed
```

注意：`db:seed` 会按脚本逻辑重置/写入演示数据，适合**第一次**或你想清空重来时。**容器启动时** `Dockerfile` 的 `CMD` 已包含 `npx prisma db push`，表结构会自动创建；seed 需你手动跑一次（若需要示例数据）。

---

## Railway 界面英文对照（便于查找）

| 英文 | 含义 |
|------|------|
| New Project | 新建项目 |
| Deploy from GitHub | 从 GitHub 部署 |
| Variables | 环境变量 |
| Volume / Add Volume | 添加持久卷 |
| Mount Path | 挂载到容器内的路径（本项目用 `/data`） |
| Settings | 设置 |
| Networking / Generate Domain | 网络 / 生成公网域名 |
| Deployments / Logs | 部署记录 / 日志（排错必看） |
| Shell | 容器内终端 |

---

## 方案 B：Render / Fly.io 等

思路相同：**从 GitHub 拉代码** → **Dockerfile 构建** → **挂载持久盘到 `/data`** → 设置与上表一致的环境变量。具体按钮名称因平台而异。

---

## 方案 C：Vercel + 仍用 SQLite？

Vercel 的无服务器文件系统**不适合**长期存 SQLite。若坚持用 Vercel，需把 `prisma/schema.prisma` 改为 **PostgreSQL** 等远程库并迁移数据，改动较大；见 [Prisma 迁移文档](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/migrating-to-postgresql)。

---

## 邀请链接与门禁（若开启 `CHAOPIN_SHARE_GATE=1`）

- 有效邀请形态：`https://你的域名/s/<token>`（由 `ShareLink` 表与后端路由提供）。
- 需在数据库中存在**未撤回**的 `ShareLink` 记录；主域名可固定，通过换新 token 控制「谁还能进」。

---

## 「Pause / Resume」与换一批人换链接

- **Pause**：服务暂停，公网通常打不开 → 对访客等于整站不可用。
- **Resume**：多数情况下仍是**同一个**默认域名，**不会**自动换成全新 URL。
- 若需要「每批人不同保密入口」：新建 Railway 项目再部署同一仓库、或使用 **`CHAOPIN_SHARE_GATE` + 邀请 token** 轮换。详见下文小结。

| 目标 | 做法 |
|------|------|
| 整站临时下线 | Pause |
| 每批不同入口 / 旧入口作废 | 新服务或新域名，或门禁 + 新 token |

---

## 排错（页面空白、打不开）

1. 打开 Railway **Deployments → Logs**，看是否有 Prisma、`DATABASE_URL`、`ENOENT`、`EPERM` 等错误。
2. 确认 **Volume 已挂载 `/data`**，且未随意改 `DATABASE_URL` 导致路径与卷不一致。
3. 浏览器 **F12 → Console**，看是否有脚本或网络错误。
4. 应用内已对门禁与首页统计做了容错；若仍异常，把 **一段日志 + Console 报错** 发给维护者对照。

---

## 小结

| 概念 | 说明 |
|------|------|
| `localhost:3000` | 仅本机开发；**不是**要给 GitHub 或 Railway 填的地址。 |
| 公网地址 | 由 **Railway（等）Networking** 生成，形如 `https://*.up.railway.app`。 |
| 数据不丢 | **必须**把持久卷挂到 **`/data`**（与默认 `DATABASE_URL` 一致）。 |
| 代码更新 | `git push` 到 GitHub 后，Railway 通常自动重新部署（以你项目里连接的分支为准）。 |
