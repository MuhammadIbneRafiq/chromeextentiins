@echo off
REM === FORCE REMOVE ALL POLICIES FROM ALL BROWSERS ===

echo =========================================
echo FORCE REMOVING ALL POLICIES
echo =========================================
echo.

echo Removing Brave policies...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallAllowlist" /f 2>nul

echo Removing Chrome policies...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallAllowlist" /f 2>nul

echo Removing Edge policies...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallAllowlist" /f 2>nul

echo Removing Comet policies...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionInstallAllowlist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Perplexity" /f 2>nul

echo.
echo =========================================
echo ALL POLICIES FORCE REMOVED!
echo =========================================
echo.
echo Now disabling incognito mode only...
echo.

REM Disable incognito mode on all browsers
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo =========================================
echo DONE!
echo =========================================
echo.
echo - ALL extension policies REMOVED
echo - Incognito mode DISABLED on all browsers
echo.
echo Restart all browsers to apply changes.
pause
