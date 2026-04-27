# 兼容旧说明：固定仓库名为 zhaopin，内部转调 push-to-github.ps1
param(
  [Parameter(Mandatory = $true)]
  [string]$GitHubUser
)
& "$PSScriptRoot/push-to-github.ps1" -GitHubUser $GitHubUser -RepoName zhaopin
