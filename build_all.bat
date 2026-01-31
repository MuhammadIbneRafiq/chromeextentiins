@echo off
setlocal
pushd "%~dp0"

echo ============================================
echo  Building Extension Guardian executables...
echo ============================================
echo.

where python >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python not found in PATH
  popd
  exit /b 1
)

set "VENV_DIR=%cd%\.build_venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"
set "VENV_PIP=%VENV_DIR%\Scripts\pip.exe"

echo Setting up isolated Python environment...
if not exist "%VENV_PYTHON%" (
  echo Creating virtual environment in "%VENV_DIR%"...
  python -m venv "%VENV_DIR%"
  if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    popd
    exit /b 1
  )
)

echo Installing required packages (no admin rights needed)...
"%VENV_PYTHON%" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
  echo [ERROR] Failed to upgrade pip inside virtual environment
  popd
  exit /b 1
)
"%VENV_PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Failed to install Python packages
  popd
  exit /b 1
)

echo.
echo Stopping any running Guardian processes...
taskkill /IM extension-guardian-desktop.exe /F >nul 2>&1
taskkill /IM extension_guardian_service.exe /F >nul 2>&1
taskkill /IM guardian_watchdog.exe /F >nul 2>&1

echo.
echo Cleaning previous build artifacts (keeping other executables)...
if exist build rmdir /s /q build
if exist __pycache__ rmdir /s /q __pycache__
if exist *.spec.old del /q *.spec.old
if not exist dist mkdir dist
if exist dist\extension-guardian-desktop.exe (
  echo Deleting old extension-guardian-desktop.exe...
  del /f /q dist\extension-guardian-desktop.exe >nul 2>&1
)
if exist dist\extension_guardian_service.exe del /q dist\extension_guardian_service.exe
if exist dist\guardian_watchdog.exe del /q dist\guardian_watchdog.exe

echo.
echo Building executables...
echo Using individual .spec files when present...

rem Desktop app (GUI)
if exist extension-guardian-desktop.spec goto build_gui_spec
echo Building extension-guardian-desktop.exe (default config)...
"%VENV_PYTHON%" -m PyInstaller --noconfirm --onefile --windowed --name extension-guardian-desktop extension-guardian-desktop.py
goto after_build_gui
:build_gui_spec
echo Building extension-guardian-desktop.exe from spec...
"%VENV_PYTHON%" -m PyInstaller --clean --noconfirm extension-guardian-desktop.spec
:after_build_gui

rem Windows service
if exist extension_guardian_service.spec goto build_svc_spec
if exist extension_guardian_service.py (
  echo Building extension_guardian_service.exe (default config)...
  "%VENV_PYTHON%" -m PyInstaller --noconfirm --onefile --name extension_guardian_service extension_guardian_service.py
)
goto after_build_svc
:build_svc_spec
echo Building extension_guardian_service.exe from spec...
"%VENV_PYTHON%" -m PyInstaller --clean --noconfirm extension_guardian_service.spec
:after_build_svc

rem Watchdog helper
if exist guardian_watchdog.spec goto build_watchdog_spec
if exist guardian_watchdog.py (
  echo Building guardian_watchdog.exe (default config)...
  "%VENV_PYTHON%" -m PyInstaller --noconfirm --onefile --name guardian_watchdog guardian_watchdog.py
)
goto after_build_watchdog
:build_watchdog_spec
echo Building guardian_watchdog.exe from spec...
"%VENV_PYTHON%" -m PyInstaller --clean --noconfirm guardian_watchdog.spec
:after_build_watchdog

rem Installer (sets up service and autostart)
if exist install_guardian_service.spec goto build_installer_spec
if exist install_guardian_service.py goto build_installer_default
echo [WARN] install_guardian_service.py not found, skipping installer build
goto after_build_installer
:build_installer_spec
echo Building install_guardian.exe from spec...
"%VENV_PYTHON%" -m PyInstaller --clean --noconfirm install_guardian_service.spec
goto after_build_installer
:build_installer_default
echo Building install_guardian.exe (default config)...
"%VENV_PYTHON%" -m PyInstaller --noconfirm --onefile --name install_guardian install_guardian_service.py
:after_build_installer

echo.
echo Checking outputs...
if exist "dist\extension-guardian-desktop.exe" (
  echo [OK] extension-guardian-desktop.exe created
) else (
  echo [ERROR] extension-guardian-desktop.exe not found
)

if exist "dist\extension_guardian_service.exe" (
  echo [OK] extension_guardian_service.exe created
) else (
  echo [WARN] extension_guardian_service.exe not found
)

if exist "dist\guardian_watchdog.exe" (
  echo [OK] guardian_watchdog.exe created
) else (
  echo [WARN] guardian_watchdog.exe not found
)

if exist "dist\install_guardian.exe" (
  echo [OK] install_guardian.exe created
) else (
  echo [WARN] install_guardian.exe not found
)

if exist "dist\uninstall_guardian.exe" (
  echo [OK] uninstall_guardian.exe created
) else (
  echo [INFO] uninstall_guardian.exe not built (optional)
)

echo.
echo Starting Extension Guardian in background (no admin required)...
if exist dist\extension-guardian-desktop.exe (
  rem Launch directly - exe is built without console so no terminal window appears
  start "" "%cd%\dist\extension-guardian-desktop.exe" --background
  echo [OK] Desktop app started in background (no terminal)
  echo [OK] App is registered to auto-start on Windows login
) else (
  echo [ERROR] Desktop app missing, cannot start
)

echo.
echo ============================================
echo  Done! Executables are in the dist folder.
echo ============================================
popd
endlocal
pause