@echo off
REM Windows Extension Lock - Batch Script
REM This script runs the PowerShell script with proper permissions
REM Run as Administrator

echo.
echo ========================================
echo    WINDOWS EXTENSION LOCK TOOL
echo ========================================
echo.
echo This tool will prevent you from disabling
echo the AI Productivity Guardian extension
echo in Brave browser using Windows policies.
echo.
echo WARNING: This modifies Windows registry
echo and Group Policy settings!
echo.
echo Make sure you have backed up your system.
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running as Administrator
) else (
    echo ❌ This script must be run as Administrator!
    echo Right-click this file and select "Run as Administrator"
    pause
    exit /b 1
)

echo.
echo Choose an option:
echo 1. Enable Extension Lock for ALL browsers (Chrome, Brave, Edge)
echo 2. Enable Extension Lock for Chrome only
echo 3. Enable Extension Lock for Brave only
echo 4. Enable Extension Lock for Microsoft Edge only
echo 5. Disable Extension Lock (Allow disabling)
echo 6. Check Status
echo 7. Exit
echo.

set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" (
    echo.
    echo 🔒 Enabling Extension Lock for ALL browsers...
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0lock-extension-windows.ps1" -Enable
) else if "%choice%"=="2" (
    echo.
    echo 🔒 Enabling Extension Lock for Chrome only...
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0lock-extension-windows.ps1" -EnableChrome
) else if "%choice%"=="3" (
    echo.
    echo 🔒 Enabling Extension Lock for Brave only...
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0lock-extension-windows.ps1" -EnableBrave
) else if "%choice%"=="4" (
    echo.
    echo 🔒 Enabling Extension Lock for Microsoft Edge only...
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0lock-extension-windows.ps1" -EnableEdge
) else if "%choice%"=="5" (
    echo.
    echo 🔓 Disabling Extension Lock...
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0lock-extension-windows.ps1" -Disable
) else if "%choice%"=="6" (
    echo.
    echo 📊 Checking Extension Lock Status...
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0lock-extension-windows.ps1" -Status
) else if "%choice%"=="7" (
    echo.
    echo 👋 Goodbye!
    exit /b 0
) else (
    echo.
    echo ❌ Invalid choice. Please run the script again.
)

echo.
echo Press any key to exit...
pause >nul
