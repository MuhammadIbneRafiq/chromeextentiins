@echo off
REM === Clean up old extension IDs and install with correct one ===

echo Cleaning up old/incorrect extension IDs from registry...
echo.

REM Delete ALL old extension settings first
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\aaaaaaaaanaaaaaaaaaiaaaaaaaaaaaaanaaaajaaaaea" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\cefohabdfmncmcilofdoodoaibcaakbc" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\aaamaaaabaaaagaaa aeaaaamaaaanaaaamaaaaea" /f 2>nul

echo Old extension IDs removed.
echo.
echo Now applying ONLY the correct extension ID...
echo.

REM Set the CORRECT extension ID
set EXT_ID=aaamaaaabaaaagaaaaeaaaamaaaanaaaamaaaaea
set UPDATE_URL=file:///C:/ProgramData/MyProductivityExtension/update.xml

REM Ensure base key exists
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /f

REM Add ONLY the correct extension with clean settings
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" /v "installation_mode" /t REG_SZ /d "force_installed" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" /v "update_url" /t REG_SZ /d "%UPDATE_URL%" /f

REM Disable Incognito mode globally
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done! Registry cleaned and ONLY correct extension ID applied.
echo Extension ID: %EXT_ID%
echo.
echo IMPORTANT: Close ALL Chrome windows and restart Chrome completely.
echo Then check chrome://extensions
echo.
pause
