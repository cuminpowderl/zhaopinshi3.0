# Non-interactive first push (no Read-Host). Fix when push-to-github.ps1 feels stuck.
# Usage (in chaopin root):
#   powershell -ExecutionPolicy Bypass -File scripts/quick-push.ps1 -GitHubUser YOUR_USER -RepoName YOUR_REPO
param(
  [Parameter(Mandatory = $true)]
  [string]$GitHubUser,
  [Parameter(Mandatory = $true)]
  [string]$RepoName
)

$ErrorActionPreference = "Continue"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

if (-not (Test-Path "package.json")) {
  Write-Host "Run from chaopin root." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".git")) {
  git init
}
git branch -M main 2>$null

Write-Host "git add -A" -ForegroundColor Cyan
git add -A

Write-Host "git commit" -ForegroundColor Cyan
git commit -m "chore: initial push"
if ($LASTEXITCODE -ne 0) {
  Write-Host "If commit failed, run:" -ForegroundColor Yellow
  Write-Host '  git config --global user.name "Your Name"' -ForegroundColor Yellow
  Write-Host '  git config --global user.email "you@example.com"' -ForegroundColor Yellow
  exit 1
}

$u = "https://github.com/$GitHubUser/$RepoName.git"
git remote remove origin 2>$null
git remote add origin $u
Write-Host "remote: $u" -ForegroundColor Green

Write-Host "git push -u origin main" -ForegroundColor Cyan
git push -u origin main
exit $LASTEXITCODE
