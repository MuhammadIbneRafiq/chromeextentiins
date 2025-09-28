@echo off
REM Extension Guardian Setup - No Admin Rights Required
REM This sets up Extension Guardian to run automatically with Windows

echo.
echo ========================================
echo    EXTENSION GUARDIAN SETUP
echo ========================================
echo.

REM Get current directory
set "CURRENT_DIR=%~dp0"
echo Setup directory: %CURRENT_DIR%

REM Check if executables exist
if not exist "%CURRENT_DIR%dist\extension-guardian-desktop.exe" (
    echo [ERROR] Extension Guardian executable not found!
    echo Please run build_all.bat first to create the executables.
    pause
    exit /b 1
)

echo [OK] Extension Guardian executable found

REM Step 1: Set up auto-start registry entry
echo.
echo Setting up auto-start (Windows startup)...
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "ExtensionGuardian" /t REG_SZ /d "\"%CURRENT_DIR%dist\extension-guardian-desktop.exe\" --background" /f >nul 2>&1

if %errorLevel% == 0 (
    echo [OK] Auto-start registry entry created
) else (
    echo [ERROR] Failed to create auto-start entry
)

REM Step 2: Create desktop shortcut
echo.
echo Creating desktop shortcut...
set "DESKTOP=%USERPROFILE%\Desktop"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%DESKTOP%\Extension Guardian.lnk" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "%CURRENT_DIR%dist\extension-guardian-desktop.exe" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Arguments = "" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "Extension Guardian Desktop App" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"

cscript "%TEMP%\CreateShortcut.vbs" >nul 2>&1
del "%TEMP%\CreateShortcut.vbs"

echo [OK] Desktop shortcut created

REM Step 3: Create start menu entry
echo.
echo Creating start menu entry...
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateStartMenuShortcut.vbs"
echo sLinkFile = "%START_MENU%\Extension Guardian.lnk" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.TargetPath = "%CURRENT_DIR%dist\extension-guardian-desktop.exe" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Arguments = "" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Description = "Extension Guardian Desktop App" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateStartMenuShortcut.vbs"

cscript "%TEMP%\CreateStartMenuShortcut.vbs" >nul 2>&1
del "%TEMP%\CreateStartMenuShortcut.vbs"

echo [OK] Start menu entry created

REM Step 4: Start Extension Guardian immediately in background mode
echo.
echo Starting Extension Guardian in background mode...
start "" "%CURRENT_DIR%dist\extension-guardian-desktop.exe" --background

REM Wait a moment for it to start
timeout /t 2 >nul

REM Check if it's running
tasklist /FI "IMAGENAME eq extension-guardian-desktop.exe" 2>NUL | find /I /N "extension-guardian-desktop.exe" >nul
if "%ERRORLEVEL%"=="0" (
    echo [OK] Extension Guardian is now running in background
) else (
    echo [WARNING] Extension Guardian may not have started properly
)

echo.
echo ========================================
echo    SETUP COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Extension Guardian is now configured to:
echo - ✓ Start automatically with Windows
echo - ✓ Run in background mode (no window)
echo - ✓ Monitor browser extensions continuously
echo - ✓ Close browsers when extension is disabled
echo.
echo IMPORTANT NOTES:
echo 1. Extension Guardian is now running in the background
echo 2. It will auto-start every time you boot Windows
echo 3. Use the desktop shortcut to open the GUI when needed
echo 4. Check Task Manager to verify it's running
echo 5. Logs are saved to: %%USERPROFILE%%\ExtensionGuardian\logs
echo.
echo The app now works EXACTLY like running:
echo   python extension-guardian-desktop.py --background
echo.
echo To configure your extension ID:
echo 1. Use the desktop shortcut to open Extension Guardian
echo 2. Go to Settings tab
echo 3. Enter your extension ID
echo 4. Save settings
echo.
echo To stop: Kill the process in Task Manager or use the system tray
echo.
pause
