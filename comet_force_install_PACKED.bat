@echo off
REM === Force-install PACKED Comet extension (prevents deactivation) ===

set EXT_ID=aaamaaaabaaaagaaaaeaaaamaaaanaaaamaaaaea
set UPDATE_URL=file:///C:/ProgramData/MyProductivityExtension/update.xml

echo Applying FORCE INSTALL policies for Comet (PACKED version)...
echo This will make the extension non-removable and non-disableable.
echo.

REM Ensure base key exists for Comet (try both Chromium and Perplexity paths)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium" /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Comet" /f

REM Force install with update URL (Chromium path)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings\%EXT_ID%" ^
 /v "installation_mode" /t REG_SZ /d "force_installed" /f

reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings\%EXT_ID%" ^
 /v "update_url" /t REG_SZ /d "%UPDATE_URL%" /f

REM Also try Perplexity path
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Comet\ExtensionSettings\%EXT_ID%" ^
 /v "installation_mode" /t REG_SZ /d "force_installed" /f

reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Perplexity\Comet\ExtensionSettings\%EXT_ID%" ^
 /v "update_url" /t REG_SZ /d "%UPDATE_URL%" /f

REM Disable Incognito mode globally
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium" ^
 /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done! Extension is now FORCE INSTALLED from packed .crx file.
echo The extension CANNOT be disabled or removed.
echo Restart Comet and check comet://policy and comet://extensions
echo.
pause
