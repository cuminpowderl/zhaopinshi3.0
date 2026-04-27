# 本地第一次跑起来：复制 .env、安装依赖、建表、种子数据、启动 dev
# 用法（在任意目录）：
#   powershell -ExecutionPolicy Bypass -File path/to/chaopin/scripts/local-setup.ps1
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "== 朝聘 · 本地环境 ==" -ForegroundColor Cyan
Write-Host "目录: $root"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未找到 Node.js。请安装 LTS: https://nodejs.org/" -ForegroundColor Red
  exit 1
}
Write-Host "Node: $(node --version)"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "提示: 未找到 git，仅本地运行不受影响。若要推 GitHub 请安装: https://git-scm.com/download/win" -ForegroundColor Yellow
}

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "已复制 .env.example -> .env" -ForegroundColor Green
  }
}

Write-Host "`n正在 npm install ..." -ForegroundColor Cyan
npm install

Write-Host "`n正在 prisma db push ..." -ForegroundColor Cyan
npx prisma db push

Write-Host "`n正在写入演示数据 db:seed ..." -ForegroundColor Cyan
npm run db:seed

Write-Host "`n启动开发服务器 http://localhost:3000 （Ctrl+C 结束）" -ForegroundColor Green
npm run dev
