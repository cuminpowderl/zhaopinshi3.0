# Windows：页面空白 / Prisma EPERM 时，先关 dev 再修复数据库与 Client
# 用法：在 chaopin 根目录  powershell -ExecutionPolicy Bypass -File .\scripts\repair-local.ps1
# 可选：-KillNode 会结束本机所有 node.exe（请先保存其他 Node 项目）
param([switch]$KillNode)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$npx = "npx"
if (Test-Path "E:\node\npx.cmd") { $npx = "E:\node\npx.cmd" }
elseif (Get-Command npx -ErrorAction SilentlyContinue) { $npx = "npx" }

$npm = "npm"
if (Test-Path "E:\node\npm.cmd") { $npm = "E:\node\npm.cmd" }
elseif (Get-Command npm -ErrorAction SilentlyContinue) { $npm = "npm" }

Write-Host "== 朝聘 · 本地修复 ==" -ForegroundColor Cyan
Write-Host "目录: $root"

if ($KillNode) {
  Write-Host "正在结束 node.exe ..." -ForegroundColor Yellow
  taskkill /F /IM node.exe 2>$null | Out-Null
  Start-Sleep -Seconds 2
}

Write-Host "prisma generate ..." -ForegroundColor Cyan
& $npx prisma generate

Write-Host "prisma db push ..." -ForegroundColor Cyan
& $npx prisma db push

Write-Host "db:seed ..." -ForegroundColor Cyan
& $npm run db:seed

Write-Host "`n完成。请重新执行: npm run dev  然后打开 http://localhost:3000" -ForegroundColor Green
