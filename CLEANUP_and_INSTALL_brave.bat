@echo off
REM === Clean up old extension IDs and install with correct one ===

echo Cleaning up old/incorrect extension IDs from registry...
echo.

REM Delete ALL old/wrong extension settings first
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\aaaaaaaaanaaaaaaaaaiaaaaaaaaaaaaanaaaajaaaaea" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\aaamaaaabaaaagaaa aeaaaamaaaanaaaamaaaaea" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\aaamaaaabaaaagaaaaeaaaamaaaanaaaamaaaaea" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\hmiiiombmheihclkcikibhigbeanbhop" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\cefohabdfmncmcilofdoodoaibcaakbc" /f 2>nul

echo Old extension IDs removed.
echo Now applying ONLY the correct extension ID...

REM Set the CORRECT extension ID (from manually installed .crx - cefohabdfmncmcilofdoodaoibcaakbc)
set EXT_ID=cefohabdfmncmcilofdoodaoibcaakbc
set UPDATE_URL=http://localhost:8888/update.xml

REM Ensure base key exists
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /f

REM Add extension to allowlist first (required for local CRX files)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallAllowlist" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallAllowlist" /v "1" /t REG_SZ /d "%EXT_ID%" /f

REM Add ONLY the correct extension with clean settings
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" /v "installation_mode" /t REG_SZ /d "force_installed" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" /v "update_url" /t REG_SZ /d "%UPDATE_URL%" /f

REM Disable Private mode globally
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done! Registry cleaned and ONLY correct extension ID applied.
echo Extension ID: %EXT_ID%
echo.
echo IMPORTANT: Close ALL Brave windows and restart Brave completely.
echo Then check brave://extensions
echo.
pause
