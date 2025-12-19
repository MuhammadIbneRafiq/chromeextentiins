@ECHO OFF
setlocal
cls
title Extension Guardian Folder Locker

:: Base folder where the repo lives – adjust if you move the repo elsewhere
set "BASE_DIR=C:\Users\wifi stuff\OneDrive - TU Eindhoven"

:: Change this password to your own secure password
set "PASSWORD=123456"

:: Folder names
set "VISIBLE_NAME=chromeextentiins"
set "HIDDEN_NAME=.chromeextentiins_locked"

if NOT EXIST "%BASE_DIR%" goto BASE_NOT_FOUND

pushd "%BASE_DIR%" >nul

if EXIST "%VISIBLE_NAME%" goto CONFIRM_LOCK
if EXIST "%HIDDEN_NAME%" goto UNLOCK
goto NO_FOLDER

:CONFIRM_LOCK
echo.
echo ========================================
echo   EXTENSION GUARDIAN FOLDER LOCKER
echo ========================================
echo.
echo Folder "%VISIBLE_NAME%" is currently UNLOCKED.
echo.
echo Are you sure you want to LOCK the folder? (Y/N)
set /p "cho=>"
if /i "%cho%"=="Y" goto LOCK
if /i "%cho%"=="N" goto END
echo Invalid choice. Please enter Y or N.
goto CONFIRM_LOCK

:LOCK
attrib +h +s "%VISIBLE_NAME%"
ren "%VISIBLE_NAME%" "%HIDDEN_NAME%"
echo.
echo [SUCCESS] Folder locked and hidden!
echo Chrome extension will NOT load while locked.
echo Run this script again to unlock.
goto END

:UNLOCK
echo.
echo ========================================
echo   EXTENSION GUARDIAN FOLDER LOCKER
echo ========================================
echo.
echo Folder is currently LOCKED.
echo.
echo Enter password to unlock:
set /p "pass=>"
if NOT "%pass%"=="%PASSWORD%" goto FAIL
attrib -h -s "%HIDDEN_NAME%"
ren "%HIDDEN_NAME%" "%VISIBLE_NAME%"
echo.
echo [SUCCESS] Folder unlocked!
echo You can now load the unpacked extension in Chrome.
goto END

:FAIL
echo.
echo [ERROR] Invalid password!
timeout /t 2 >nul
goto END

:NO_FOLDER
popd >nul
echo.
echo [ERROR] Could not find the extension folder!
echo Looking for: "%VISIBLE_NAME%" or "%HIDDEN_NAME%"
echo Make sure this script is in: %~dp0
goto END

:BASE_NOT_FOUND
echo.
echo [ERROR] Base directory "%BASE_DIR%" not found.
goto END

:END
popd >nul 2>&1
echo.
pause
endlocal
