# Requires admin
# Usage: Right-click PowerShell -> Run as Administrator, then run:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   ./scripts/setup-force-install.ps1

function Require-Admin {
  $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $currentUser.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Error 'Please run this script as Administrator.'
    exit 1
  }
}

function Get-FileUri([string]$path) {
  $full = (Resolve-Path $path).Path
  $uri = New-Object System.Uri($full)
  return $uri.AbsoluteUri
}

Require-Admin

$repoRoot = Split-Path $PSScriptRoot -Parent
$distDir = Join-Path $repoRoot 'dist'
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

Write-Host '=== AI Productivity Guardian - Force Install Setup ===' -ForegroundColor Cyan
$browser = Read-Host 'Choose browser [chrome/brave] (default: brave)'
if ([string]::IsNullOrWhiteSpace($browser)) { $browser = 'brave' }
if ($browser -notin @('chrome','brave')) { Write-Error 'Invalid browser selection'; exit 1 }

$defaultCrx = Join-Path $distDir 'ai_productivity_guardian.crx'
$crxPath = Read-Host "Path to .crx (default: $defaultCrx)"
if ([string]::IsNullOrWhiteSpace($crxPath)) { $crxPath = $defaultCrx }
if (-not (Test-Path $crxPath)) { Write-Error "CRX not found at $crxPath. Pack the extension first (chrome://extensions → Pack extension)."; exit 1 }

$extId = Read-Host 'Extension ID (from chrome://extensions after installing the CRX once)'
if ([string]::IsNullOrWhiteSpace($extId)) { Write-Error 'Extension ID is required.'; exit 1 }

$updateUrl = Get-FileUri $crxPath
$updateXml = @(
  "<?xml version='1.0' encoding='UTF-8'?>",
  "<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>",
  "  <app appid='$extId'>",
  "    <updatecheck codebase='$updateUrl' version='1.0.0' />",
  "  </app>",
  "</gupdate>"
) -join "`n"

$updateXmlPath = Join-Path $distDir 'update.xml'
$updateXml | Set-Content -Path $updateXmlPath -Encoding UTF8
Write-Host "Wrote $updateXmlPath" -ForegroundColor Green

if ($browser -eq 'chrome') {
  $policyKey = 'HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist'
} else {
  $policyKey = 'HKLM:\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist'
}

New-Item -Path $policyKey -Force | Out-Null
New-ItemProperty -Path $policyKey -Name '1' -Value "$extId;$updateXmlPath" -PropertyType String -Force | Out-Null
Write-Host "Policy set at $policyKey with value '$extId;$updateXmlPath'" -ForegroundColor Green

Write-Host "Done. Restart the browser. The extension will be force-installed and removal will be disabled by policy." -ForegroundColor Cyan
