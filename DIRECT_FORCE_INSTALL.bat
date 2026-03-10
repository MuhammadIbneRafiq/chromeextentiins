@echo off
REM === Direct Force-Install Method (No Server Required) ===

echo Installing extension DIRECTLY from .crx file...
echo This method bypasses update.xml and HTTP server completely.
echo.

set EXT_ID=cefohabdfmncmcilofdoodoaibcaakbc
set CRX_PATH=C:\ProgramData\MyProductivityExtension\extension.crx

REM Clean up any existing settings
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\aaaaaaaaanaaaaaaaaaiaaaaaaaaaaaaanaaaajaaaaea" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\aaamaaaabaaaagaaa aeaaaamaaaanaaaamaaaaea" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\aaamaaaabaaaagaaaaeaaaamaaaanaaaamaaaaea" /f 2>nul
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\cefohabdfmncmcilofdoodoaibcaakbc" /f 2>nul

REM Ensure base key exists
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /f

REM Direct force-install from local .crx file
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" /v "installation_mode" /t REG_SZ /d "force_installed" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" /v "override_update_url" /t REG_DWORD /d 1 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" /v "update_url" /t REG_SZ /d "file:///%CRX_PATH%" /f

REM Disable incognito mode globally
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done! Extension force-installed directly from .crx file
echo Extension ID: %EXT_ID%
echo CRX Path: %CRX_PATH%
echo.
echo This method should work without any HTTP server!
echo Restart Brave completely and check brave://extensions
echo.
pause
