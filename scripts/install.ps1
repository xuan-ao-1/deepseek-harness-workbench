# =============================================================================
# DeepSeek Harness Workbench — 一键安装 / 更新脚本
#
# 用法（无需提前安装任何东西，PowerShell 5+ / pwsh 均可）：
#
#   # 1) 安装 Setup 版（静默安装到 %LOCALAPPDATA%\Programs，创建桌面/开始菜单快捷方式）
#   irm https://raw.githubusercontent.com/xuan-ao-1/deepseek-harness-workbench/main/scripts/install.ps1 | iex
#
#   # 2) 部署 Portable 版（解压到指定目录，绿色携带）
#   irm https://raw.githubusercontent.com/xuan-ao-1/deepseek-harness-workbench/main/scripts/install.ps1 | iex -Args "-Portable"
#
#   # 3) 自定义便携版目录
#   irm https://raw.githubusercontent.com/xuan-ao-1/deepseek-harness-workbench/main/scripts/install.ps1 | iex -Args "-Portable -InstallDir D:\Apps\DeepSeek Harness"
#
# 行为：
#   - 自动查询 GitHub 最新 Release
#   - 下载对应安装包并校验 SHA256SUMS
#   - Setup 版静默安装后自动启动；Portable 版就位后自动启动（首次解压约 3-4 分钟）
# =============================================================================

[CmdletBinding()]
param(
  [switch]$Portable,
  [string]$InstallDir = ""
)

$ErrorActionPreference = 'Stop'
$repo   = 'xuan-ao-1/deepseek-harness-workbench'
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"
$ua     = 'DeepSeek-Harness-Workbench-Installer'

function Write-Step([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Err([string]$msg)  { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }

Write-Step "DeepSeek Harness Workbench 安装器"

# ---- 1) 查询最新 Release ------------------------------------------------
Write-Step "查询最新版本（$repo）"
$headers = @{ 'User-Agent' = $ua }
$release = Invoke-RestMethod -Uri $apiUrl -Headers $headers -TimeoutSec 30
$version = ($release.tag_name -replace '^v', '').Trim()
Write-Ok "最新版本: $version"

# ---- 2) 定位资产 --------------------------------------------------------
$assetName = if ($Portable) {
  "DeepSeek-Harness-Workbench-$version-Portable-x64.exe"
} else {
  "DeepSeek-Harness-Workbench-$version-Setup-x64.exe"
}
$asset = $release.assets | Where-Object { $_.name -eq $assetName }
if (-not $asset) { Write-Err "Release $version 中未找到资产: $assetName" }
Write-Ok "资产: $assetName ($([math]::Round($asset.size / 1MB, 1)) MB)"

# ---- 3) 下载 + SHA256 校验 ----------------------------------------------
$tmpFile = Join-Path $env:TEMP $assetName
Write-Step "下载安装包..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmpFile -Headers $headers -TimeoutSec 600
Write-Ok "下载完成: $tmpFile"

Write-Step "校验 SHA256..."
$sumsAsset = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS.txt' }
if ($sumsAsset) {
  $sumsText = (Invoke-WebRequest -Uri $sumsAsset.browser_download_url -Headers $headers -TimeoutSec 60).Content
  $expected = (($sumsText -split "`r?`n") | Where-Object { $_ -match [regex]::Escape($assetName) } | ForEach-Object { ($_ -split '\s+')[0] } | Select-Object -First 1)
  if ($expected) {
    $actual = (Get-FileHash -Path $tmpFile -Algorithm SHA256).Hash.ToLower()
    if ($actual -ne $expected.ToLower()) {
      Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
      Write-Err "SHA256 校验失败（下载文件可能已损坏），已删除安装包。"
    }
    Write-Ok "SHA256 校验通过"
  } else {
    Write-Host "    [warn] SHA256SUMS.txt 中未找到 $assetName 的记录，跳过校验" -ForegroundColor Yellow
  }
} else {
  Write-Host "    [warn] Release 未附带 SHA256SUMS.txt，跳过校验" -ForegroundColor Yellow
}

# ---- 4) 安装 / 部署 -----------------------------------------------------
if (-not $Portable) {
  # Setup 版：NSIS 静默安装（oneClick=false，安装到 %LOCALAPPDATA%\Programs）
  Write-Step "静默安装（约 1-2 分钟）..."
  $p = Start-Process -FilePath $tmpFile -ArgumentList '/S' -Wait -PassThru
  if ($p.ExitCode -ne 0) { Write-Err "安装失败，退出码 $($p.ExitCode)" }
  Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
  Write-Ok "安装完成！已创建桌面 / 开始菜单快捷方式"

  $appExe = Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness Workbench\DeepSeek Harness Workbench.exe'
  if (Test-Path $appExe) {
    Start-Process $appExe
    Write-Ok "已启动 Workbench"
  } else {
    Write-Host "    请从开始菜单启动 DeepSeek Harness Workbench" -ForegroundColor Yellow
  }
} else {
  # Portable 版：就位到目标目录
  $targetDir = if ($InstallDir.Trim() -ne '') { $InstallDir.Trim() } else { Join-Path $env:USERPROFILE 'DeepSeek Harness Workbench' }
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  $portableExe = Join-Path $targetDir $assetName
  Move-Item -Force $tmpFile $portableExe
  Write-Ok "便携版已就位: $portableExe"
  Write-Host "    首次启动会自动解压（约 3-4 分钟），数据保存在 exe 旁 data/ 目录" -ForegroundColor Yellow
  Start-Process $portableExe
  Write-Ok "已启动 Workbench"
}

Write-Step "完成"
