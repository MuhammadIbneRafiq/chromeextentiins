@echo off
REM Run Extension Guardian Permanently - Impossible to Remove While Running
REM This makes Extension Guardian run at SYSTEM level with maximum protection

echo.
echo ========================================
echo    EXTENSION GUARDIAN PERMANENT MODE
echo ========================================
echo.
echo This will configure Extension Guardian to run PERMANENTLY
echo and make it nearly impossible to disable or remove.
echo.

set "CURRENT_DIR=%~dp0"
echo Installation directory: %CURRENT_DIR%

REM Check if executables exist
if not exist "%CURRENT_DIR%dist\extension-guardian-desktop.exe" (
    echo [ERROR] Extension Guardian executable not found!
    echo Please run build_all.bat first.
    pause
    exit /b 1
)

echo [OK] Executable found

REM Step 1: Install as Windows Service (maximum protection)
echo.
echo Installing as Windows Service (requires admin rights)...
if exist "%CURRENT_DIR%dist\extension_guardian_service.exe" (
    "%CURRENT_DIR%dist\extension_guardian_service.exe" install
    if %errorLevel% == 0 (
        echo [OK] Service installed successfully
        net start ExtensionGuardianService
        echo [OK] Service started
    ) else (
        echo [WARNING] Service installation requires admin rights
    )
) else (
    echo [INFO] Service installer not available
)

REM Step 2: Add to Windows Startup (multiple layers)
echo.
echo Adding to Windows startup (multiple registry entries)...

REM User startup
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "ExtensionGuardian" /t REG_SZ /d "\"%CURRENT_DIR%dist\extension-guardian-desktop.exe\" --background" /f >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] User startup registry entry created
)

REM Local Machine startup (requires admin)
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "ExtensionGuardian" /t REG_SZ /d "\"%CURRENT_DIR%dist\extension-guardian-desktop.exe\" --background" /f >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] System startup registry entry created
) else (
    echo [INFO] Could not add to system startup (needs admin)
)

REM Step 3: Add to Startup Folder
echo.
echo Adding to startup folder...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if not exist "%STARTUP_FOLDER%\Extension Guardian.lnk" (
    echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateStartupShortcut.vbs"
    echo sLinkFile = "%STARTUP_FOLDER%\Extension Guardian.lnk" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.TargetPath = "%CURRENT_DIR%dist\extension-guardian-desktop.exe" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.Arguments = "--background" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.Description = "Extension Guardian (Permanent)" >> "%TEMP%\CreateStartupShortcut.vbs"
    echo oLink.Save >> "%TEMP%\CreateStartupShortcut.vbs"
    cscript "%TEMP%\CreateStartupShortcut.vbs" >nul 2>&1
    del "%TEMP%\CreateStartupShortcut.vbs"
    echo [OK] Startup folder shortcut created
)

REM Step 4: Start the watchdog to prevent termination
echo.
echo Starting Guardian Watchdog (prevents shutdown)...
if exist "%CURRENT_DIR%dist\guardian_watchdog.exe" (
    start "" /MIN "%CURRENT_DIR%dist\guardian_watchdog.exe"
    timeout /t 1 >nul
    echo [OK] Watchdog started
) else (
    echo [WARNING] Watchdog not found, creating fallback...
    REM Create a simple watchdog script that keeps the guardian running
    echo @echo off > "%TEMP%\guardian_restart.bat"
    echo :start >> "%TEMP%\guardian_restart.bat"
    echo tasklist /FI "IMAGENAME eq extension-guardian-desktop.exe" 2^>NUL ^| find /I /N "extension-guardian-desktop.exe" ^>nul >> "%TEMP%\guardian_restart.bat"
    echo if "%%ERRORLEVEL%%"^=="0" goto :wait >> "%TEMP%\guardian_restart.bat"
    echo start "" /MIN "%CURRENT_DIR%dist\extension-guardian-desktop.exe" --background >> "%TEMP%\guardian_restart.bat"
    echo :wait >> "%TEMP%\guardian_restart.bat"
    echo timeout /t 10 >nul >> "%TEMP%\guardian_restart.bat"
    echo goto :start >> "%TEMP%\guardian_restart.bat"
    
    start "" /MIN "%TEMP%\guardian_restart.bat"
    echo [OK] Fallback watchdog created
)

REM Step 5: Start Guardian immediately
echo.
echo Starting Extension Guardian in permanent background mode...
start "" /MIN "%CURRENT_DIR%dist\extension-guardian-desktop.exe" --background

REM Wait and verify
timeout /t 2 >nul
tasklist /FI "IMAGENAME eq extension-guardian-desktop.exe" 2>NUL | find /I /N "extension-guardian-desktop.exe" >nul
if "%ERRORLEVEL%"=="0" (
    echo [OK] Extension Guardian is now running in PERMANENT mode
) else (
    echo [WARNING] Guardian may not have started properly
)

echo.
echo ========================================
echo    PERMANENT MODE ACTIVATED!
echo ========================================
echo.
echo Extension Guardian is now configured to be PERMANENT and UNREMOVABLE:
echo.
echo Protection Layers:
echo 1. Windows Service (auto-starts, survives logoff)
echo 2. User Startup Registry (runs on login)
echo 3. System Startup Registry (runs at boot)
echo 4. Startup Folder (additional layer)
echo 5. Watchdog Process (keeps it running)
echo.
echo The app will now:
echo - Start automatically on every Windows boot
echo - Restart if killed (watchdog protection)
echo - Run in hidden background mode
echo - Survive user logoff/logon
echo.
echo To verify it's running:
echo - Open Task Manager
echo - Look for "extension-guardian-desktop.exe"
echo - Check Windows Services for "ExtensionGuardianService"
echo.
echo The extension protection is now ACTIVE and PERMANENT!
echo.
pause
