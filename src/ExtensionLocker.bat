@ECHO OFF
setlocal EnableDelayedExpansion
cls
title Extension Guardian Folder Locker

REM ============================================================
REM This script locks/unlocks the chromeextentiins folder.
REM MOVE THIS SCRIPT to the PARENT folder of chromeextentiins!
REM Then run it from there.
REM ============================================================

REM Change this password to your own secure password
set "PASSWORD=123456"

REM Folder name to lock/unlock
set "FOLDER_NAME=chromeextentiins"

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

REM Full path to the folder to lock
set "FOLDER_PATH=%SCRIPT_DIR%%FOLDER_NAME%"

REM Check if folder exists as hidden (using dir with hidden+system attributes)
dir /a:hs "%FOLDER_PATH%" >nul 2>&1
if %errorlevel%==0 goto :UNLOCK

REM Check if folder exists and is visible
if EXIST "%FOLDER_PATH%" goto :CONFIRM_LOCK

REM Folder not found at all (neither visible nor hidden)
goto :NO_FOLDER

:CONFIRM_LOCK
echo.
echo ========================================
echo   EXTENSION GUARDIAN FOLDER LOCKER
echo ========================================
echo.
echo Folder [%FOLDER_NAME%] is currently UNLOCKED (visible).
echo Location: %FOLDER_PATH%
echo.
echo Are you sure you want to LOCK the folder? (Y/N)
set /p "cho="
if /i "%cho%"=="Y" goto :LOCK
if /i "%cho%"=="N" goto :END
echo Invalid choice. Please enter Y or N.
goto :CONFIRM_LOCK

:LOCK
echo.
echo Locking folder...
attrib +h +s "%FOLDER_PATH%"
echo.
echo [SUCCESS] Folder locked and hidden!
echo Chrome extension will NOT load while locked.
echo.
echo NOTE: To see hidden folders in File Explorer:
echo       View -^> Show -^> Hidden items
echo.
echo Run this script again to unlock.
goto :END

:UNLOCK
echo.
echo ========================================
echo   EXTENSION GUARDIAN FOLDER LOCKER
echo ========================================
echo.
echo Folder [%FOLDER_NAME%] is currently LOCKED (hidden).
echo Location: %FOLDER_PATH%
echo.
echo Enter password to unlock:
set /p "pass="
if NOT "%pass%"=="%PASSWORD%" goto :FAIL
echo.
echo Unlocking folder...
attrib -h -s "%FOLDER_PATH%"
echo.
echo [SUCCESS] Folder unlocked!
echo You can now load the unpacked extension in Chrome.
goto :END

:FAIL
echo.
echo [ERROR] Invalid password!
timeout /t 2 >nul
goto :END

:NO_FOLDER
echo.
echo [ERROR] Could not find the extension folder!
echo Looking for: %FOLDER_PATH%
echo.
echo Make sure:
echo   1. This script is in the PARENT folder (same level as %FOLDER_NAME%)
echo   2. The %FOLDER_NAME% folder exists
goto :END

:END
echo.
pause
endlocal