# Extension Guardian Windows Service
# PowerShell script for advanced Windows integration and service management

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Install", "Uninstall", "Start", "Stop", "Status")]
    [string]$Action = "Status",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "ExtensionGuardian",
    
    [Parameter(Mandatory=$false)]
    [string]$ScriptPath = $PSScriptRoot
)

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Create Windows Service
function Install-ExtensionGuardianService {
    Write-Host "Installing Extension Guardian as Windows Service..." -ForegroundColor Green
    
    if (-not (Test-Administrator)) {
        Write-Error "This script must be run as Administrator to install a Windows Service"
        return
    }
    
    $serviceExists = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($serviceExists) {
        Write-Warning "Service '$ServiceName' already exists. Uninstalling first..."
        Uninstall-ExtensionGuardianService
    }
    
    $pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $pythonPath) {
        Write-Error "Python not found in PATH. Please install Python and ensure it's in your PATH."
        return
    }
    
    $scriptFile = Join-Path $ScriptPath "extension-guardian-desktop.py"
    if (-not (Test-Path $scriptFile)) {
        Write-Error "Extension Guardian script not found: $scriptFile"
        return
    }
    
    # Create service using New-Service
    try {
        $service = New-Service -Name $ServiceName `
                              -BinaryPathName "$pythonPath `"$scriptFile`"" `
                              -DisplayName "Extension Guardian Desktop App" `
                              -Description "Monitors browser extension status and enforces restrictions" `
                              -StartupType Automatic `
                              -ErrorAction Stop
        
        Write-Host "✅ Service '$ServiceName' installed successfully" -ForegroundColor Green
        
        # Set service to run as Local System
        $serviceConfig = Get-WmiObject -Class Win32_Service -Filter "Name='$ServiceName'"
        $serviceConfig.Change($null, $null, $null, $null, $null, $null, "LocalSystem", $null)
        
        Write-Host "✅ Service configured to run as Local System" -ForegroundColor Green
        
    } catch {
        Write-Error "Failed to install service: $($_.Exception.Message)"
        return
    }
}

# Uninstall Windows Service
function Uninstall-ExtensionGuardianService {
    Write-Host "Uninstalling Extension Guardian Service..." -ForegroundColor Yellow
    
    if (-not (Test-Administrator)) {
        Write-Error "This script must be run as Administrator to uninstall a Windows Service"
        return
    }
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Write-Host "Stopping service..."
            Stop-Service -Name $ServiceName -Force
        }
        
        try {
            Remove-Service -Name $ServiceName -ErrorAction Stop
            Write-Host "✅ Service '$ServiceName' uninstalled successfully" -ForegroundColor Green
        } catch {
            Write-Error "Failed to uninstall service: $($_.Exception.Message)"
        }
    } else {
        Write-Host "Service '$ServiceName' not found" -ForegroundColor Yellow
    }
}

# Start Service
function Start-ExtensionGuardianService {
    Write-Host "Starting Extension Guardian Service..." -ForegroundColor Green
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -ne "Running") {
            try {
                Start-Service -Name $ServiceName
                Write-Host "✅ Service started successfully" -ForegroundColor Green
            } catch {
                Write-Error "Failed to start service: $($_.Exception.Message)"
            }
        } else {
            Write-Host "Service is already running" -ForegroundColor Yellow
        }
    } else {
        Write-Error "Service '$ServiceName' not found. Install it first."
    }
}

# Stop Service
function Stop-ExtensionGuardianService {
    Write-Host "Stopping Extension Guardian Service..." -ForegroundColor Yellow
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            try {
                Stop-Service -Name $ServiceName -Force
                Write-Host "✅ Service stopped successfully" -ForegroundColor Green
            } catch {
                Write-Error "Failed to stop service: $($_.Exception.Message)"
            }
        } else {
            Write-Host "Service is already stopped" -ForegroundColor Yellow
        }
    } else {
        Write-Error "Service '$ServiceName' not found"
    }
}

# Check Service Status
function Get-ExtensionGuardianStatus {
    Write-Host "Extension Guardian Service Status" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "Service Name: $($service.Name)" -ForegroundColor White
        Write-Host "Display Name: $($service.DisplayName)" -ForegroundColor White
        Write-Host "Status: " -NoNewline -ForegroundColor White
        
        switch ($service.Status) {
            "Running" { Write-Host "Running" -ForegroundColor Green }
            "Stopped" { Write-Host "Stopped" -ForegroundColor Red }
            "Starting" { Write-Host "Starting" -ForegroundColor Yellow }
            "Stopping" { Write-Host "Stopping" -ForegroundColor Yellow }
            default { Write-Host $service.Status -ForegroundColor Yellow }
        }
        
        Write-Host "Start Type: $($service.StartType)" -ForegroundColor White
        
        # Show service details
        $serviceDetails = Get-WmiObject -Class Win32_Service -Filter "Name='$ServiceName'"
        Write-Host "Service Account: $($serviceDetails.StartName)" -ForegroundColor White
        Write-Host "Executable Path: $($serviceDetails.PathName)" -ForegroundColor White
        
    } else {
        Write-Host "Service '$ServiceName' not installed" -ForegroundColor Red
    }
    
    # Show related processes
    Write-Host "`nRelated Processes:" -ForegroundColor Cyan
    $pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*extension-guardian-desktop.py*"
    }
    
    if ($pythonProcesses) {
        foreach ($proc in $pythonProcesses) {
            Write-Host "PID: $($proc.Id) - $($proc.ProcessName)" -ForegroundColor Green
        }
    } else {
        Write-Host "No Extension Guardian processes found" -ForegroundColor Yellow
    }
}

# Advanced Registry Protection
function Set-ExtensionGuardianProtection {
    param([bool]$Enable)
    
    Write-Host "Setting Extension Guardian Registry Protection..." -ForegroundColor Green
    
    if (-not (Test-Administrator)) {
        Write-Error "Administrator privileges required for registry protection"
        return
    }
    
    $registryPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
    )
    
    foreach ($regPath in $registryPaths) {
        try {
            if ($Enable) {
                # Add protection entries
                Write-Host "Adding protection to: $regPath" -ForegroundColor Yellow
                # Implementation would go here
            } else {
                # Remove protection entries
                Write-Host "Removing protection from: $regPath" -ForegroundColor Yellow
                # Implementation would go here
            }
        } catch {
            Write-Warning "Could not modify registry path: $regPath - $($_.Exception.Message)"
        }
    }
}

# Main execution
switch ($Action) {
    "Install" {
        Install-ExtensionGuardianService
    }
    "Uninstall" {
        Uninstall-ExtensionGuardianService
    }
    "Start" {
        Start-ExtensionGuardianService
    }
    "Stop" {
        Stop-ExtensionGuardianService
    }
    "Status" {
        Get-ExtensionGuardianStatus
    }
    default {
        Write-Host "Usage: .\extension-guardian-service.ps1 -Action [Install|Uninstall|Start|Stop|Status]" -ForegroundColor Yellow
        Write-Host "Example: .\extension-guardian-service.ps1 -Action Install" -ForegroundColor Yellow
    }
}

Write-Host "`nExtension Guardian Service Management Complete" -ForegroundColor Cyan
