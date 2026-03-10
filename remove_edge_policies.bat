@echo off
REM === Remove ALL Edge force-install policies to allow manual installation ===

set EXT_ID=cefohabdfmncmcilofdoodaoibcaakbc

echo Removing ALL Edge force-install policies...
echo This will allow you to manually install extensions.
echo.

REM Remove extension-specific settings
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings\%EXT_ID%" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallAllowlist" /f 2>nul

REM Remove global incognito policy
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" /v "IncognitoModeAvailability" /f 2>nul

echo.
echo Done! ALL Edge policies removed.
echo You can now manually install any extensions.
echo.
pause
