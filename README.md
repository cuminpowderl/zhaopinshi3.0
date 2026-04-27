# 朝聘

作品集演示：**流程看板**（含人才库）、**自定义字段 + 测评**（通用 / **性格测评**分流）、**Agent**（多选阶段：简历条件 + 性格门槛）、**简历图片识别**（OpenAI）、**简历来源**。吉祥物「噜噜」素材见 `public/agent/`。默认 SQLite。

## 本地运行

**Windows 一键（推荐）**：在资源管理器中进入本文件夹，地址栏输入 `powershell` 回车，执行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
.\scripts\local-setup.ps1
```

或手动：

```bash
cd chaopin
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

浏览器打开 <http://localhost:3000>。重置演示数据：`npm run db:seed`。

若 `prisma generate` 报 EPERM，请先**结束正在运行的 `npm run dev`** 后再执行 `npx prisma generate`。

若 **3000 端口被占用** 导致异常，可先关掉别的 `npm run dev`，或看终端里 Next 自动改用 **3001** 的提示。

### 推到 GitHub（Windows）

1. 在 GitHub 新建**空**仓库（不要勾选 README）。
2. 在本项目根目录打开 PowerShell，执行：

```powershell
.\scripts\push-to-github.ps1
```

按提示输入用户名、仓库名；若 `push` 失败，脚本会打印 **Personal Access Token** 的图文说明。公网部署仍看 **[DEPLOY.md](./DEPLOY.md)**。

## 环境变量（可选）

| 变量 | 作用 |
|------|------|
| `OPENAI_API_KEY` | 简历图片「识别并填充」 |
| `OPENAI_VISION_MODEL` | 默认 `gpt-4o-mini` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Agent / 人工淘汰发信；`SMTP_FROM` 选填 |

**说明**：岗位对学历、年限、城市等「要求」在 Agent 面板配置；候选人侧在表单里填写对应自定义字段。性格测试在「筛选字段设置」里添加为「性格测评」类型，与笔试/机试分开；未通过可入人才库（Agent 或编辑里「淘汰并入人才库」）。

## 部署（公网）

**不依赖某一台电脑、从 GitHub 到 Railway 公网地址**的完整步骤见根目录 **[DEPLOY.md](./DEPLOY.md)**（Docker + SQLite 卷挂载 `/data`）。

若改用 Neon / Turso 等远程库，需调整 `DATABASE_URL` 与 `schema`，并执行 `prisma migrate deploy` 与 seed。
