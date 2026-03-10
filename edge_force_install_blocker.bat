@echo off
REM === Force-install Edge extension (prevents uninstall without admin) ===

REM Extension ID
set EXT_ID=cefohabdfmncmcilofdoodoaibcaakbc

REM Extension folder path (Windows style)
set EXT_PATH_WIN=C:\Users\wifi stuff\OneDrive - TU Eindhoven\chromeextentiins

REM Convert to file:// URL style
set EXT_PATH_URL=file:///C:/Users/wifi stuff/OneDrive - TU Eindhoven/chromeextentiins

echo Applying FORCE INSTALL policies for Edge extension %EXT_ID% ...
echo This will prevent uninstalling the extension without admin privileges.
echo.

REM 1) Ensure base key exists
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" /f

REM 2) Set installation_mode = force_installed (CRITICAL - prevents user uninstall)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings\%EXT_ID%" ^
 /v "installation_mode" /t REG_SZ /d "force_installed" /f

REM 3) Set update_url to local extension folder
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings\%EXT_ID%" ^
 /v "update_url" /t REG_SZ /d "%EXT_PATH_URL%" /f

REM 4) Force override_update_url = 1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings\%EXT_ID%" ^
 /v "override_update_url" /t REG_DWORD /d 1 /f

REM 5) Force Incognito mode ON for this extension (incognito_mode = 2)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings\%EXT_ID%" ^
 /v "incognito_mode" /t REG_DWORD /d 2 /f

REM 6) Disable InPrivate mode globally (InPrivateModeAvailability = 1)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" ^
 /v "InPrivateModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done! Extension is now FORCE INSTALLED in Edge - cannot be removed without admin privileges.
echo Restart Edge and check edge://policy and edge://extensions
echo.
pause
