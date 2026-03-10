@echo off
REM === Force-install PACKED Chrome extension (prevents deactivation) ===

set EXT_ID=aaamaaaabaaaagaaaaeaaaamaaaanaaaamaaaaea
set UPDATE_URL=file:///C:/ProgramData/MyProductivityExtension/update.xml

echo Applying FORCE INSTALL policies for Chrome (PACKED version)...
echo This will make the extension non-removable and non-disableable.
echo.

REM Ensure base key exists
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /f

REM Force install with update URL
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" ^
 /v "installation_mode" /t REG_SZ /d "force_installed" /f

reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" ^
 /v "update_url" /t REG_SZ /d "%UPDATE_URL%" /f

REM Disable Incognito mode globally
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" ^
 /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done! Extension is now FORCE INSTALLED from packed .crx file.
echo The extension CANNOT be disabled or removed.
echo Restart Chrome and check chrome://policy and chrome://extensions
echo.
pause
