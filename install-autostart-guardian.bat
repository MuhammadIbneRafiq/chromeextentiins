@echo off
REM Complete Extension Guardian Installation with Auto-start
REM This script installs Extension Guardian and sets it to run automatically

echo.
echo ========================================
echo    EXTENSION GUARDIAN AUTO-INSTALL
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
echo Starting complete installation with auto-start...
echo.

REM Get current directory
set "CURRENT_DIR=%~dp0"
echo Current directory: %CURRENT_DIR%

REM Check if executables exist
if not exist "%CURRENT_DIR%dist\extension-guardian-desktop.exe" (
    echo [ERROR] Extension Guardian executable not found!
    echo Please run build_all.bat first to create the executables.
    pause
    exit /b 1
)

echo [OK] Extension Guardian executable found

REM Check if Python is installed (needed for any fallback scenarios)
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Python is not installed or not in PATH
    echo This is okay if you're using the compiled executables only
) else (
    echo [OK] Python found
    python --version
)

REM Install required packages (in case someone wants to run the Python version)
echo.
echo Installing required Python packages...
pip install -r "%CURRENT_DIR%requirements.txt" >nul 2>&1

REM Create installation directory
set "INSTALL_DIR=%PROGRAMFILES%\ExtensionGuardian"
echo.
echo Creating installation directory: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Copy executables to installation directory
echo.
echo Copying executables to installation directory...
copy "%CURRENT_DIR%dist\*.exe" "%INSTALL_DIR%\" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Executables copied successfully
) else (
    echo [ERROR] Failed to copy executables
    pause
    exit /b 1
)

REM Copy Python files as backup
echo.
echo Copying Python files as backup...
copy "%CURRENT_DIR%*.py" "%INSTALL_DIR%\" >nul 2>&1
copy "%CURRENT_DIR%requirements.txt" "%INSTALL_DIR%\" >nul 2>&1

REM Set up registry entry for installation path
echo.
echo Setting up registry entries...
reg add "HKLM\SOFTWARE\ExtensionGuardian" /v "InstallPath" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1
reg add "HKLM\SOFTWARE\ExtensionGuardian" /v "Version" /t REG_SZ /d "1.0.0" /f >nul 2>&1
reg add "HKLM\SOFTWARE\ExtensionGuardian" /v "Protected" /t REG_DWORD /d 1 /f >nul 2>&1

if %errorLevel% == 0 (
    echo [OK] Registry entries created
) else (
    echo [WARNING] Could not create system registry entries, trying user registry...
    reg add "HKCU\SOFTWARE\ExtensionGuardian" /v "InstallPath" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1
    reg add "HKCU\SOFTWARE\ExtensionGuardian" /v "Version" /t REG_SZ /d "1.0.0" /f >nul 2>&1
    reg add "HKCU\SOFTWARE\ExtensionGuardian" /v "Protected" /t REG_DWORD /d 1 /f >nul 2>&1
)

REM Create auto-start registry entry
echo.
echo Setting up auto-start (Windows startup)...
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "ExtensionGuardian" /t REG_SZ /d "\"%INSTALL_DIR%\extension-guardian-desktop.exe\" --background" /f >nul 2>&1

if %errorLevel% == 0 (
    echo [OK] Auto-start registry entry created
) else (
    echo [ERROR] Failed to create auto-start entry
)

REM Install the Windows Service (if available)
echo.
echo Installing Windows Service...
if exist "%INSTALL_DIR%\install_guardian.exe" (
    "%INSTALL_DIR%\install_guardian.exe"
    if %errorLevel% == 0 (
        echo [OK] Windows Service installed successfully
    ) else (
        echo [WARNING] Service installation failed, but continuing...
    )
) else (
    echo [INFO] Service installer not available, skipping service installation
)

REM Create desktop shortcut
echo.
echo Creating desktop shortcut...
set "DESKTOP=%USERPROFILE%\Desktop"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%DESKTOP%\Extension Guardian.lnk" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "%INSTALL_DIR%\extension-guardian-desktop.exe" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Arguments = "" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\CreateShortcut.vbs"
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
echo oLink.TargetPath = "%INSTALL_DIR%\extension-guardian-desktop.exe" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Arguments = "" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Description = "Extension Guardian Desktop App" >> "%TEMP%\CreateStartMenuShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateStartMenuShortcut.vbs"

cscript "%TEMP%\CreateStartMenuShortcut.vbs" >nul 2>&1
del "%TEMP%\CreateStartMenuShortcut.vbs"

echo [OK] Start menu entry created

REM Start the guardian immediately in background mode
echo.
echo Starting Extension Guardian in background mode...
start "" "%INSTALL_DIR%\extension-guardian-desktop.exe" --background

echo.
echo ========================================
echo    INSTALLATION COMPLETED SUCCESSFULLY
echo ========================================
echo.
echo Extension Guardian has been installed and configured!
echo.
echo Features configured:
echo - ✓ Auto-start with Windows (Registry method)
echo - ✓ Background monitoring enabled
echo - ✓ Desktop shortcut created
echo - ✓ Start menu entry created
echo - ✓ Installation directory: %INSTALL_DIR%
echo - ✓ Guardian started in background mode
echo.
echo IMPORTANT NOTES:
echo 1. Extension Guardian is now running in the background
echo 2. It will automatically start every time you boot Windows
echo 3. To configure settings, use the desktop shortcut
echo 4. Check Task Manager to verify it's running
echo 5. The app should now work exactly like: python extension-guardian-desktop.py --background
echo.
echo To uninstall: Run uninstall_guardian.exe from the installation directory
echo.
pause
