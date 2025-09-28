@echo off
REM Native Messaging Host Setup Script
REM This script registers the native messaging host with Chrome/Edge

echo.
echo ========================================
echo    NATIVE MESSAGING HOST SETUP
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

set "CURRENT_DIR=%~dp0"
set "PYTHON_PATH=python"
set "HOST_PATH=%CURRENT_DIR%native-messaging-host.py"

echo Setting up Native Messaging Host...
echo Host Path: %HOST_PATH%
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo [OK] Python found
python --version

REM Check if host script exists
if not exist "%HOST_PATH%" (
    echo [ERROR] Native messaging host script not found: %HOST_PATH%
    pause
    exit /b 1
)

echo [OK] Native messaging host script found

REM Create registry entries for Chrome
echo.
echo Creating registry entries for Chrome...

set "CHROME_REG_PATH=HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.extensionguardian.native_messaging_host"
reg add "%CHROME_REG_PATH%" /ve /d "%CURRENT_DIR%com.extensionguardian.native_messaging_manifest.json" /f

if %errorLevel% == 0 (
    echo [OK] Chrome registry entry created
) else (
    echo [ERROR] Failed to create Chrome registry entry
)

REM Create registry entries for Edge
echo.
echo Creating registry entries for Edge...

set "EDGE_REG_PATH=HKEY_CURRENT_USER\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.extensionguardian.native_messaging_host"
reg add "%EDGE_REG_PATH%" /ve /d "%CURRENT_DIR%com.extensionguardian.native_messaging_manifest.json" /f

if %errorLevel% == 0 (
    echo [OK] Edge registry entry created
) else (
    echo [ERROR] Failed to create Edge registry entry
)

REM Update manifest file with correct Python path
echo.
echo Updating native messaging manifest...

set "MANIFEST_PATH=%CURRENT_DIR%com.extensionguardian.native_messaging_manifest.json"

REM Create updated manifest with correct Python path
echo {> "%MANIFEST_PATH%"
echo     "name": "com.extensionguardian.native_messaging_host",>> "%MANIFEST_PATH%"
echo     "description": "Extension Guardian Native Messaging Host",>> "%MANIFEST_PATH%"
echo     "path": "%PYTHON_PATH%",>> "%MANIFEST_PATH%"
echo     "args": ["%HOST_PATH%"],>> "%MANIFEST_PATH%"
echo     "type": "stdio",>> "%MANIFEST_PATH%"
echo     "allowed_origins": [>> "%MANIFEST_PATH%"
echo         "chrome-extension://your-extension-id-here/">> "%MANIFEST_PATH%"
echo     ]>> "%MANIFEST_PATH%"
echo }>> "%MANIFEST_PATH%"

echo [OK] Native messaging manifest updated

REM Test the native messaging host
echo.
echo Testing native messaging host...

echo {"type":"test","message":"hello"} | "%PYTHON_PATH%" "%HOST_PATH%"

if %errorLevel% == 0 (
    echo [OK] Native messaging host test successful
) else (
    echo [WARNING] Native messaging host test failed (this may be normal)
)

echo.
echo ========================================
echo    SETUP COMPLETED
echo ========================================
echo.
echo Native Messaging Host has been set up successfully!
echo.
echo IMPORTANT: You need to update the extension ID in the manifest file:
echo %MANIFEST_PATH%
echo.
echo Replace "your-extension-id-here" with your actual extension ID.
echo You can find your extension ID in chrome://extensions/
echo.
echo After updating the extension ID, restart your browser for changes to take effect.
echo.
pause
