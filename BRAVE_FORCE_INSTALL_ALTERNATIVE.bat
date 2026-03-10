@echo off
REM === Brave Alternative Force-Install Method ===

echo Trying alternative Brave force-install method...
echo Using ExtensionInstallForcelist instead of ExtensionSettings
echo.

set EXT_ID=cefohabdfmncmcilofdoodaoibcaakbc
set UPDATE_URL=http://localhost:8888/update.xml

REM Clean up old policies first
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallAllowlist" /f 2>nul

REM Remove all old extension IDs from forcelist
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /f 2>nul

REM Add extension to forcelist (Chrome/Chromium standard method)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;%UPDATE_URL%" /f

REM Also try the Chrome path (some Brave versions use this)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /f 2>nul
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;%UPDATE_URL%" /f 2>nul

REM Disable incognito mode
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Alternative force-install method applied.
echo Extension ID: %EXT_ID%
echo Method: ExtensionInstallForcelist
echo.
echo Restart Brave and check if toggle/remove buttons are gone.
pause
