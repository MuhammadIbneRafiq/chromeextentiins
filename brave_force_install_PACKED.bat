@echo off
REM === Force-install PACKED Brave extension (prevents deactivation) ===

set EXT_ID=aaamaaaabaaaagaaaaeaaaamaaaanaaaamaaaaea
set UPDATE_URL=file:///C:/ProgramData/MyProductivityExtension/update.xml

echo Applying FORCE INSTALL policies for Brave (PACKED version)...
echo This will make the extension non-removable and non-disableable.
echo.

REM Ensure base key exists
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" /f

REM Force install with update URL
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" ^
 /v "installation_mode" /t REG_SZ /d "force_installed" /f

reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings\%EXT_ID%" ^
 /v "update_url" /t REG_SZ /d "%UPDATE_URL%" /f

REM Disable Private mode globally
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave" ^
 /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done! Extension is now FORCE INSTALLED from packed .crx file.
echo The extension CANNOT be disabled or removed.
echo Restart Brave and check brave://policy and brave://extensions
echo.
pause
