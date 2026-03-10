@echo off
REM === Comet Browser Force-Install Extension (WITH INCOGNITO ACCESS) ===

echo =========================================
echo Installing Extension for Comet Browser
echo WITH INCOGNITO ACCESS ENABLED
echo =========================================
echo.

set EXT_ID=cefohabdfmncmcilofdoodaoibcaakbc
set UPDATE_URL=http://localhost:8888/update.xml

REM Clean up old policies first
echo Cleaning up old Comet policies...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionInstallAllowlist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionInstallForcelist" /f 2>nul

REM Also clean Perplexity path (Comet sometimes uses this)
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Perplexity\ExtensionSettings" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Perplexity\ExtensionInstallForcelist" /f 2>nul

echo Old policies removed.
echo.

REM Create Chromium policy path
echo Setting up force-install for Comet...
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium" /f

REM Method 1: ExtensionInstallForcelist (standard method)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionInstallForcelist" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;%UPDATE_URL%" /f

REM Method 2: ExtensionSettings (belt and suspenders)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings\%EXT_ID%" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings\%EXT_ID%" /v "installation_mode" /t REG_SZ /d "force_installed" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings\%EXT_ID%" /v "update_url" /t REG_SZ /d "%UPDATE_URL%" /f

REM Allow incognito mode (extension will work in incognito)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium" /v "IncognitoModeAvailability" /t REG_DWORD /d 0 /f

REM Enable extension in incognito mode
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings\%EXT_ID%" /v "incognito_access" /t REG_SZ /d "force_enabled" /f

echo.
echo =========================================
echo Comet policies applied successfully!
echo =========================================
echo.
echo Extension ID: %EXT_ID%
echo Update URL: %UPDATE_URL%
echo Incognito Access: ENABLED
echo.
echo NEXT STEPS:
echo 1. Close ALL Comet windows
echo 2. Wait 5 seconds
echo 3. Restart Comet
echo 4. Go to comet://extensions
echo 5. Extension should be locked (no toggle/remove)
echo 6. Extension will work in incognito mode
echo.
pause
