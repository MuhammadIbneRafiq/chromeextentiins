@echo off
REM Extension Guardian Desktop App Installation Script
REM Run as Administrator for full functionality

echo.
echo ========================================
echo    EXTENSION GUARDIAN INSTALLATION
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
) else (
    echo [ERROR] This script must be run as Administrator!
    echo Right-click this file and select "Run as Administrator"
    pause
    exit /b 1
)

echo.
echo Installing Extension Guardian Desktop Application...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo [OK] Python found
python --version

REM Install required packages
echo.
echo Installing required Python packages...
set "CURRENT_DIR=%~dp0"
pip install -r "%CURRENT_DIR%requirements.txt"

if %errorLevel% neq 0 (
    echo [ERROR] Failed to install Python packages
    pause
    exit /b 1
)

echo [OK] Python packages installed successfully

REM Create desktop shortcut
echo.
echo Creating desktop shortcut...
set "DESKTOP=%USERPROFILE%\Desktop"
set "CURRENT_DIR=%~dp0"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%DESKTOP%\Extension Guardian.lnk" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "python" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Arguments = ""%CURRENT_DIR%extension-guardian-desktop.py"" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "Extension Guardian Desktop App" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"

cscript "%TEMP%\CreateShortcut.vbs" >nul 2>&1
del "%TEMP%\CreateShortcut.vbs"

echo [OK] Desktop shortcut created

REM Create start menu entry
echo.
echo Creating start menu entry...
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateStartMenuShortcut.vbs"
echo sLinkFile = "%START_MENU%\Extension Guardian.lnk" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.TargetPath = "python" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Arguments = ""%CURRENT_DIR%extension-guardian-desktop.py"" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Description = "Extension Guardian Desktop App" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateStartMenuShortcut.vbs"

cscript "%TEMP%\CreateStartMenuShortcut.vbs" >nul 2>&1
del "%TEMP%\CreateStartMenuShortcut.vbs"

echo [OK] Start menu entry created

REM Create auto-start entry (optional)
echo.
set /p auto_start="Do you want Extension Guardian to start automatically with Windows? (y/n): "
if /i "%auto_start%"=="y" (
    echo Creating auto-start entry...
    set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
    
    echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateStartupShortcut.vbs"
    echo sLinkFile = "%STARTUP%\Extension Guardian.lnk" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.TargetPath = "python" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.Arguments = ""%CURRENT_DIR%extension-guardian-desktop.py"" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.Description = "Extension Guardian Desktop App" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.Save >> "%TEMP%\CreateStartupShortcut.vbs"
    
    cscript "%TEMP%\CreateStartupShortcut.vbs" >nul 2>&1
    del "%TEMP%\CreateStartupShortcut.vbs"
    
    echo [OK] Auto-start entry created
) else (
    echo Auto-start not configured
)

echo.
echo ========================================
echo    INSTALLATION COMPLETED
echo ========================================
echo.
echo Extension Guardian has been installed successfully!
echo.
echo Features:
echo - Monitors browser extension status
echo - Closes browsers when extension is disabled
echo - Uninstall protection with timer
echo - Real-time status monitoring
echo.
echo You can now:
echo 1. Run Extension Guardian from the desktop shortcut
echo 2. Or run: python extension-guardian-desktop.py
echo 3. Configure your extension ID in the settings
echo.
echo IMPORTANT: Make sure to set your extension ID in the
echo application settings before enabling monitoring.
echo.
pause
