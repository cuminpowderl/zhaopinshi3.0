# Push this repo to GitHub (interactive)
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/push-to-github.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/push-to-github.ps1 -GitHubUser zhangsan -RepoName chaopin
param(
  [string]$GitHubUser = "",
  [string]$RepoName = ""
)

# Use Continue so git writing to stderr (warnings, rev-parse) does not stop the script
$ErrorActionPreference = "Continue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if (-not (Test-Path "package.json")) {
  Write-Host "Error: package.json not found. Run from chaopin repo root." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Git not found. Install: https://git-scm.com/download/win" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "======== Push to GitHub ========" -ForegroundColor Cyan
Write-Host "Directory: $root"
Write-Host ""

if ([string]::IsNullOrWhiteSpace($GitHubUser)) {
  $GitHubUser = Read-Host 'GitHub username (from github.com/YOURNAME)'
}
if ([string]::IsNullOrWhiteSpace($GitHubUser)) {
  Write-Host "Cancelled (no username)." -ForegroundColor Red
  exit 1
}

if ([string]::IsNullOrWhiteSpace($RepoName)) {
  $in = Read-Host 'Repo name (default: chaopin)'
  if ([string]::IsNullOrWhiteSpace($in)) {
    $RepoName = "chaopin"
  } else {
    $RepoName = $in
  }
}

$remoteUrl = "https://github.com/$GitHubUser/$RepoName.git"
Write-Host ""
Write-Host "Open in browser: https://github.com/new" -ForegroundColor Yellow
Write-Host "  Repo name: $RepoName"
Write-Host "  Do NOT add README / .gitignore / license"
Write-Host ""
Read-Host "After empty repo is created, press Enter"

if (-not (Test-Path ".git")) {
  git init
  Write-Host "git init done" -ForegroundColor Green
}

git branch -M main 2>$null

Write-Host ""
Write-Host "git add -A ..." -ForegroundColor Cyan
git add -A

$porcelain = git status --porcelain
# Empty repo has 0 commits; do not use rev-parse HEAD (errors to stderr on Windows)
$countOut = git rev-list --all --count 2>$null
$hasAnyCommit = $false
if ($countOut -match "^\d+$" -and [int]$countOut -gt 0) {
  $hasAnyCommit = $true
}

if (-not [string]::IsNullOrWhiteSpace($porcelain)) {
  $msg = Read-Host 'Commit message (default: chore: sync)'
  if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "chore: sync" }
  git commit -m $msg
  if ($LASTEXITCODE -ne 0) {
    Write-Host "git commit failed. Configure user:" -ForegroundColor Red
    Write-Host '  git config --global user.name "Your Name"'
    Write-Host '  git config --global user.email "you@example.com"'
    exit 1
  }
} elseif (-not $hasAnyCommit) {
  Write-Host "No changes; creating empty commit for first push ..." -ForegroundColor Yellow
  git commit --allow-empty -m "chore: initial empty commit"
} else {
  Write-Host "Nothing to commit; pushing as-is." -ForegroundColor Yellow
}

git remote remove origin 2>$null
git remote add origin $remoteUrl
Write-Host ""
Write-Host "remote: $remoteUrl" -ForegroundColor Green

Write-Host ""
Write-Host "git push -u origin main ..." -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "OK. Next: Railway -> New Project -> Deploy from GitHub. See DEPLOY.md" -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "********** push failed - help **********" -ForegroundColor Yellow
Write-Host "1) Login error: GitHub -> Settings -> Developer settings -> Personal access tokens (classic) -> repo scope. Then: git push -u origin main (password = token)" -ForegroundColor Yellow
Write-Host "2) non-fast-forward: create a new empty repo or git pull --rebase (ask someone who knows Git)" -ForegroundColor Yellow
Write-Host "3) Remote URL must match:" -ForegroundColor Yellow
Write-Host "   $remoteUrl" -ForegroundColor Yellow
exit 1
