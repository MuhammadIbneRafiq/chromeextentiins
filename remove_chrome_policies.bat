@echo off
REM === Remove ALL Chrome force-install policies to allow manual installation ===

set EXT_ID=cefohabdfmncmcilofdoodaoibcaakbc

echo Removing ALL Chrome force-install policies...
echo This will allow you to manually install extensions.
echo.

REM Remove extension-specific settings
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallAllowlist" /f 2>nul

REM Remove global incognito policy
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /v "IncognitoModeAvailability" /f 2>nul

echo.
echo Done! ALL Chrome policies removed.
echo You can now manually install any extensions.
echo.
pause
