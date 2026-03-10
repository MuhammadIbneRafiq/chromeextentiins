@echo off
REM === Remove ALL Brave force-install policies to allow manual installation ===

set EXT_ID=cefohabdfmncmcilofdoodaoibcaakbc

echo Removing ALL Brave force-install policies...
echo This will allow you to manually install extensions.
echo.

REM Remove extension-specific settings
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallAllowlist" /f 2>nul

REM Remove global incognito policy
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /f 2>nul

echo.
echo Done! ALL Brave policies removed.
echo You can now manually install any extensions.
echo.
pause
