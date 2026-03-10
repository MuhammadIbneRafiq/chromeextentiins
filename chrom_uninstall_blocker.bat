@echo off
REM === Lock custom Chrome extension and disable Incognito ===

REM Extension ID
set EXT_ID=cefohabdfmncmcilofdoodoaibcaakbc

REM Extension folder path (Windows style)
set EXT_PATH_WIN=C:\Users\wifi stuff\OneDrive - TU Eindhoven\chromeextentiins

REM Convert to file:// URL style (just replace backslashes with forward slashes)
set EXT_PATH_URL=file:///C:/Users/wifi stuff/OneDrive - TU Eindhoven/chromeextentiins

echo Applying policies for Chrome extension %EXT_ID% ...
echo.

REM 1) Ensure base key exists
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /f

REM 2) Set installation_mode = normal_installed
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" ^
 /v "installation_mode" /t REG_SZ /d "normal_installed" /f

REM 3) Set update_url to local extension folder
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" ^
 /v "update_url" /t REG_SZ /d "%EXT_PATH_URL%" /f

REM 4) Force override_update_url = 1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" ^
 /v "override_update_url" /t REG_DWORD /d 1 /f

REM 5) Force Incognito mode ON for this extension (incognito_mode = 2)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\%EXT_ID%" ^
 /v "incognito_mode" /t REG_DWORD /d 2 /f

REM 6) Disable Incognito mode globally (IncognitoModeAvailability = 1)
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" ^
 /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f

echo.
echo Done. Now restart Chrome and check chrome://policy and chrome://extensions
echo.
pause
