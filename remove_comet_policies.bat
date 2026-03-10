@echo off
REM === Remove ALL Comet force-install policies to allow manual installation ===

set EXT_ID=cefohabdfmncmcilofdoodaoibcaakbc

echo Removing ALL Comet force-install policies...
echo This will allow you to manually install extensions.
echo.

REM Remove Chromium path policies
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings\%EXT_ID%" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionInstallAllowlist" /f 2>nul

REM Remove Perplexity path policies
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Perplexity\ExtensionSettings\%EXT_ID%" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Perplexity\ExtensionInstallForcelist" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Perplexity\ExtensionInstallAllowlist" /f 2>nul

REM Remove global incognito policies
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium" /v "IncognitoModeAvailability" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Perplexity" /v "IncognitoModeAvailability" /f 2>nul

echo.
echo Done! ALL Comet policies removed.
echo You can now manually install any extensions.
echo.
pause
