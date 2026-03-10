@echo off
REM === Force-install PACKED Edge extension (prevents deactivation) ===

set EXT_ID=aaamaaaabaaaagaaaaeaaaamaaaanaaaamaaaaea
set UPDATE_URL=file:///C:/ProgramData/MyProductivityExtension/update.xml

echo Applying FORCE INSTALL policies for Edge (PACKED version)...
echo This will make the extension non-removable and non-disableable.
echo.

REM Ensure base key exists
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" /f

REM Force install with update URL
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings\%EXT_ID%" ^
 /v "installation_mode" /t REG_SZ /d "force_installed" /f

reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings\%EXT_ID%" ^
 /v "update_url" /t REG_SZ /d "%UPDATE_URL%" /f

REM Disable InPrivate mode globally
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" ^
 /v "InPrivateModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done! Extension is now FORCE INSTALLED from packed .crx file.
echo The extension CANNOT be disabled or removed.
echo Restart Edge and check edge://policy and edge://extensions
echo.
pause
