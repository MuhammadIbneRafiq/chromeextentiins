@echo off
echo =========================================
echo DIAGNOSING: What's Actually Happening
echo =========================================
echo.

echo 1. Checking current registry policies...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings" /s
echo.
echo 2. Checking allowlist...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallAllowlist" /s
echo.
echo 3. Checking for any blocking policies...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallBlocklist" /s
echo.
echo 4. Checking global extension policies...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" | findstr /i "extension"
echo.
echo 5. Checking if extension files exist...
dir "C:\ProgramData\MyProductivityExtension\extension.crx"
dir "C:\ProgramData\MyProductivityExtension\update.xml"
echo.
echo 6. Checking HTTP server accessibility...
curl -I http://localhost:8888/update.xml
curl -I http://localhost:8888/extension.crx
echo.
echo =========================================
echo Done. Check the output above.
echo =========================================
pause
