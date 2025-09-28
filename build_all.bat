@echo off
echo Building Extension Guardian executables...

echo Installing required packages...
pip install pyinstaller pywin32 pystray pillow psutil

echo Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo Building all executables with guardian.spec...
python -m PyInstaller --clean guardian.spec

echo Checking if all executables were created...
if exist "dist\extension-guardian-desktop.exe" (
    echo [OK] extension-guardian-desktop.exe created
) else (
    echo [ERROR] extension-guardian-desktop.exe not found
)

if exist "dist\extension_guardian_service.exe" (
    echo [OK] extension_guardian_service.exe created
) else (
    echo [ERROR] extension_guardian_service.exe not found
)

if exist "dist\install_guardian.exe" (
    echo [OK] install_guardian.exe created
) else (
    echo [ERROR] install_guardian.exe not found
)

if exist "dist\uninstall_guardian.exe" (
    echo [OK] uninstall_guardian.exe created
) else (
    echo [ERROR] uninstall_guardian.exe not found
)

if exist "dist\guardian_watchdog.exe" (
    echo [OK] guardian_watchdog.exe created
) else (
    echo [ERROR] guardian_watchdog.exe not found
)

echo Done!
echo All executables are in the dist folder.
pause
