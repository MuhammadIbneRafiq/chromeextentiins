# Windows Extension Lock - PowerShell Script
# This script modifies Windows registry and Group Policy to prevent extension disabling
# Run as Administrator

param(
    [switch]$Enable,
    [switch]$Disable,
    [switch]$Status
)

$ExtensionId = "ihgblohlcibknaohodhpmonfbegkoafd"
$ExtensionName = "AI Productivity Guardian"

# Registry paths
$ChromePolicyPath = "HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\$ExtensionId"
$BravePolicyPath = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\$ExtensionId"
$EdgePolicyPath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings\$ExtensionId"
$ChromeExtensionsPath = "HKLM:\SOFTWARE\Policies\Google\Chrome\Extensions"
$BraveExtensionsPath = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave\Extensions"
$EdgeExtensionsPath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge\Extensions"

Write-Host "🛡️ Windows Extension Lock Script" -ForegroundColor Cyan
Write-Host "Extension ID: $ExtensionId" -ForegroundColor Yellow
Write-Host "Extension Name: $ExtensionName" -ForegroundColor Yellow
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

function Enable-ExtensionLock {
    Write-Host "🔒 Enabling Extension Lock..." -ForegroundColor Green
    
    try {
        # Create Chrome policy registry entries
        Write-Host "Creating Chrome policy entries..." -ForegroundColor Yellow
        
        if (!(Test-Path $ChromePolicyPath)) {
            New-Item -Path $ChromePolicyPath -Force | Out-Null
        }
        
        Set-ItemProperty -Path $ChromePolicyPath -Name "installation_mode" -Value "force_installed" -Type String
        Set-ItemProperty -Path $ChromePolicyPath -Name "update_url" -Value "https://clients2.google.com/service/update2/crx" -Type String
        Set-ItemProperty -Path $ChromePolicyPath -Name "blocked_permissions" -Value @("management") -Type MultiString
        Set-ItemProperty -Path $ChromePolicyPath -Name "runtime_blocked_hosts" -Value @("*://chrome.google.com/webstore*") -Type MultiString
        
        # Create Brave policy registry entries
        Write-Host "Creating Brave policy entries..." -ForegroundColor Yellow
        
        if (!(Test-Path $BravePolicyPath)) {
            New-Item -Path $BravePolicyPath -Force | Out-Null
        }
        
        Set-ItemProperty -Path $BravePolicyPath -Name "installation_mode" -Value "force_installed" -Type String
        Set-ItemProperty -Path $BravePolicyPath -Name "update_url" -Value "https://clients2.google.com/service/update2/crx" -Type String
        Set-ItemProperty -Path $BravePolicyPath -Name "blocked_permissions" -Value @("management") -Type MultiString
        Set-ItemProperty -Path $BravePolicyPath -Name "runtime_blocked_hosts" -Value @("*://chrome.google.com/webstore*") -Type MultiString
        
        # Create Microsoft Edge policy registry entries
        Write-Host "Creating Microsoft Edge policy entries..." -ForegroundColor Yellow
        
        if (!(Test-Path $EdgePolicyPath)) {
            New-Item -Path $EdgePolicyPath -Force | Out-Null
        }
        
        Set-ItemProperty -Path $EdgePolicyPath -Name "installation_mode" -Value "force_installed" -Type String
        Set-ItemProperty -Path $EdgePolicyPath -Name "update_url" -Value "https://clients2.google.com/service/update2/crx" -Type String
        Set-ItemProperty -Path $EdgePolicyPath -Name "blocked_permissions" -Value @("management") -Type MultiString
        Set-ItemProperty -Path $EdgePolicyPath -Name "runtime_blocked_hosts" -Value @("*://chrome.google.com/webstore*") -Type MultiString
        
        # Disable extension management
        Write-Host "Disabling extension management..." -ForegroundColor Yellow
        
        $ChromeExtensionsPath = "HKLM:\SOFTWARE\Policies\Google\Chrome"
        $BraveExtensionsPath = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave"
        $EdgeExtensionsPath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
        
        if (!(Test-Path $ChromeExtensionsPath)) {
            New-Item -Path $ChromeExtensionsPath -Force | Out-Null
        }
        
        if (!(Test-Path $BraveExtensionsPath)) {
            New-Item -Path $BraveExtensionsPath -Force | Out-Null
        }
        
        if (!(Test-Path $EdgeExtensionsPath)) {
            New-Item -Path $EdgeExtensionsPath -Force | Out-Null
        }
        
        # Chrome settings
        Set-ItemProperty -Path $ChromeExtensionsPath -Name "ExtensionInstallBlacklist" -Value @("*") -Type MultiString
        Set-ItemProperty -Path $ChromeExtensionsPath -Name "ExtensionInstallWhitelist" -Value @($ExtensionId) -Type MultiString
        Set-ItemProperty -Path $ChromeExtensionsPath -Name "ExtensionInstallForcelist" -Value @("$ExtensionId;https://clients2.google.com/service/update2/crx") -Type MultiString
        
        # Brave settings
        Set-ItemProperty -Path $BraveExtensionsPath -Name "ExtensionInstallBlacklist" -Value @("*") -Type MultiString
        Set-ItemProperty -Path $BraveExtensionsPath -Name "ExtensionInstallWhitelist" -Value @($ExtensionId) -Type MultiString
        Set-ItemProperty -Path $BraveExtensionsPath -Name "ExtensionInstallForcelist" -Value @("$ExtensionId;https://clients2.google.com/service/update2/crx") -Type MultiString
        
        # Microsoft Edge settings
        Set-ItemProperty -Path $EdgeExtensionsPath -Name "ExtensionInstallBlacklist" -Value @("*") -Type MultiString
        Set-ItemProperty -Path $EdgeExtensionsPath -Name "ExtensionInstallWhitelist" -Value @($ExtensionId) -Type MultiString
        Set-ItemProperty -Path $EdgeExtensionsPath -Name "ExtensionInstallForcelist" -Value @("$ExtensionId;https://clients2.google.com/service/update2/crx") -Type MultiString
        
        # Disable extension management UI
        Set-ItemProperty -Path $ChromeExtensionsPath -Name "ExtensionSettings" -Value @{
            "$ExtensionId" = @{
                "installation_mode" = "force_installed"
                "blocked_permissions" = @("management")
            }
        }
        
        Set-ItemProperty -Path $BraveExtensionsPath -Name "ExtensionSettings" -Value @{
            "$ExtensionId" = @{
                "installation_mode" = "force_installed"
                "blocked_permissions" = @("management")
            }
        }
        
        Set-ItemProperty -Path $EdgeExtensionsPath -Name "ExtensionSettings" -Value @{
            "$ExtensionId" = @{
                "installation_mode" = "force_installed"
                "blocked_permissions" = @("management")
            }
        }
        
        # Create Group Policy Object
        Write-Host "Creating Group Policy restrictions..." -ForegroundColor Yellow
        
        $GPOContent = @"
<?xml version="1.0" encoding="utf-8"?>
<gpo xmlns="http://www.microsoft.com/GroupPolicy/Settings" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <identifier>
    <identifier xmlns="http://www.microsoft.com/GroupPolicy/Types">{$(New-Guid)}</identifier>
    <name>Extension Lock Policy</name>
    <includeComments>true</includeComments>
    <versionDirectory>1</versionDirectory>
    <versionSysvol>1</versionSysvol>
  </identifier>
  <qfe version="0"/>
  <computer>
    <versionDirectory>1</versionDirectory>
    <versionSysvol>1</versionSysvol>
    <extensionData>
      <extension xmlns="http://www.microsoft.com/GroupPolicy/Settings/Registry" xmlns:q1="http://www.microsoft.com/GroupPolicy/Settings/Registry" xsi:type="q1:RegistrySettings">
        <q1:policy>
          <q1:policyState>Enabled</q1:policyState>
          <q1:name>Lock Extension Management</q1:name>
          <q1:explanationText>Prevents disabling of AI Productivity Guardian extension</q1:explanationText>
        </q1:policy>
      </extension>
    </extensionData>
  </computer>
</gpo>
"@
        
        $GPOPath = "$env:SystemRoot\System32\GroupPolicy\Machine\Registry.pol"
        $GPOContent | Out-File -FilePath $GPOPath -Encoding UTF8 -Force
        
        Write-Host "✅ Extension lock enabled successfully!" -ForegroundColor Green
        Write-Host "🔄 Restart Chrome, Brave, and Edge browsers for changes to take effect" -ForegroundColor Yellow
        
    } catch {
        Write-Host "❌ Error enabling extension lock: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

function Disable-ExtensionLock {
    Write-Host "🔓 Disabling Extension Lock..." -ForegroundColor Yellow
    
    try {
        # Remove Chrome policy entries
        if (Test-Path $ChromePolicyPath) {
            Remove-Item -Path $ChromePolicyPath -Recurse -Force
        }
        
        # Remove Brave policy entries
        if (Test-Path $BravePolicyPath) {
            Remove-Item -Path $BravePolicyPath -Recurse -Force
        }
        
        # Remove Microsoft Edge policy entries
        if (Test-Path $EdgePolicyPath) {
            Remove-Item -Path $EdgePolicyPath -Recurse -Force
        }
        
        # Reset extension management settings
        $ChromeExtensionsPath = "HKLM:\SOFTWARE\Policies\Google\Chrome"
        $BraveExtensionsPath = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave"
        $EdgeExtensionsPath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
        
        if (Test-Path "$ChromeExtensionsPath\ExtensionInstallBlacklist") {
            Remove-ItemProperty -Path $ChromeExtensionsPath -Name "ExtensionInstallBlacklist" -Force
        }
        
        if (Test-Path "$ChromeExtensionsPath\ExtensionInstallWhitelist") {
            Remove-ItemProperty -Path $ChromeExtensionsPath -Name "ExtensionInstallWhitelist" -Force
        }
        
        if (Test-Path "$ChromeExtensionsPath\ExtensionInstallForcelist") {
            Remove-ItemProperty -Path $ChromeExtensionsPath -Name "ExtensionInstallForcelist" -Force
        }
        
        if (Test-Path "$BraveExtensionsPath\ExtensionInstallBlacklist") {
            Remove-ItemProperty -Path $BraveExtensionsPath -Name "ExtensionInstallBlacklist" -Force
        }
        
        if (Test-Path "$BraveExtensionsPath\ExtensionInstallWhitelist") {
            Remove-ItemProperty -Path $BraveExtensionsPath -Name "ExtensionInstallWhitelist" -Force
        }
        
        if (Test-Path "$BraveExtensionsPath\ExtensionInstallForcelist") {
            Remove-ItemProperty -Path $BraveExtensionsPath -Name "ExtensionInstallForcelist" -Force
        }
        
        if (Test-Path "$EdgeExtensionsPath\ExtensionInstallBlacklist") {
            Remove-ItemProperty -Path $EdgeExtensionsPath -Name "ExtensionInstallBlacklist" -Force
        }
        
        if (Test-Path "$EdgeExtensionsPath\ExtensionInstallWhitelist") {
            Remove-ItemProperty -Path $EdgeExtensionsPath -Name "ExtensionInstallWhitelist" -Force
        }
        
        if (Test-Path "$EdgeExtensionsPath\ExtensionInstallForcelist") {
            Remove-ItemProperty -Path $EdgeExtensionsPath -Name "ExtensionInstallForcelist" -Force
        }
        
        Write-Host "✅ Extension lock disabled successfully!" -ForegroundColor Green
        Write-Host "🔄 Restart Chrome, Brave, and Edge browsers for changes to take effect" -ForegroundColor Yellow
        
    } catch {
        Write-Host "❌ Error disabling extension lock: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

function Show-Status {
    Write-Host "📊 Extension Lock Status:" -ForegroundColor Cyan
    
    $ChromeLocked = Test-Path $ChromePolicyPath
    $BraveLocked = Test-Path $BravePolicyPath
    $EdgeLocked = Test-Path $EdgePolicyPath
    
    Write-Host "Chrome Extension Lock: " -NoNewline
    if ($ChromeLocked) {
        Write-Host "ENABLED" -ForegroundColor Green
    } else {
        Write-Host "DISABLED" -ForegroundColor Red
    }
    
    Write-Host "Brave Extension Lock: " -NoNewline
    if ($BraveLocked) {
        Write-Host "ENABLED" -ForegroundColor Green
    } else {
        Write-Host "DISABLED" -ForegroundColor Red
    }
    
    Write-Host "Microsoft Edge Extension Lock: " -NoNewline
    if ($EdgeLocked) {
        Write-Host "ENABLED" -ForegroundColor Green
    } else {
        Write-Host "DISABLED" -ForegroundColor Red
    }
    
    # Check registry values
    try {
        $ChromePolicy = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Google\Chrome" -ErrorAction SilentlyContinue
        if ($ChromePolicy) {
            Write-Host "Chrome Policy Status: ACTIVE" -ForegroundColor Green
        } else {
            Write-Host "Chrome Policy Status: INACTIVE" -ForegroundColor Red
        }
    } catch {
        Write-Host "Chrome Policy Status: INACTIVE" -ForegroundColor Red
    }
    
    try {
        $BravePolicy = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave" -ErrorAction SilentlyContinue
        if ($BravePolicy) {
            Write-Host "Brave Policy Status: ACTIVE" -ForegroundColor Green
        } else {
            Write-Host "Brave Policy Status: INACTIVE" -ForegroundColor Red
        }
    } catch {
        Write-Host "Brave Policy Status: INACTIVE" -ForegroundColor Red
    }
    
    try {
        $EdgePolicy = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -ErrorAction SilentlyContinue
        if ($EdgePolicy) {
            Write-Host "Microsoft Edge Policy Status: ACTIVE" -ForegroundColor Green
        } else {
            Write-Host "Microsoft Edge Policy Status: INACTIVE" -ForegroundColor Red
        }
    } catch {
        Write-Host "Microsoft Edge Policy Status: INACTIVE" -ForegroundColor Red
    }
}

# Main execution
if ($Enable) {
    Enable-ExtensionLock
} elseif ($Disable) {
    Disable-ExtensionLock
} elseif ($Status) {
    Show-Status
} else {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\lock-extension-windows.ps1 -Enable    # Enable extension lock" -ForegroundColor White
    Write-Host "  .\lock-extension-windows.ps1 -Disable   # Disable extension lock" -ForegroundColor White
    Write-Host "  .\lock-extension-windows.ps1 -Status    # Check lock status" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  WARNING: This modifies Windows registry and Group Policy!" -ForegroundColor Red
    Write-Host "Make sure to run as Administrator and backup your system first." -ForegroundColor Red
}
