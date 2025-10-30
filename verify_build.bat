@echo off
echo ============================================
echo  Verifying Extension Guardian Build
echo ============================================
echo.

echo Checking dist folder...
if exist "dist\extension-guardian-desktop.exe" (
  echo [OK] extension-guardian-desktop.exe exists
  echo.
  echo File info:
  dir "dist\extension-guardian-desktop.exe"
  echo.
  echo ============================================
  echo IMPORTANT: Check the window title when you run it!
  echo It should show: "Extension Guardian v2024.12.19-NO-EXIT-v2"
  echo ============================================
) else (
  echo [ERROR] extension-guardian-desktop.exe NOT FOUND in dist folder!
  echo Please run build_all.bat first.
)

echo.
pause

