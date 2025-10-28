@echo off
echo Starting Extension Guardian in protected mode (no exit allowed)...

REM Set environment variable to disable exit functionality
set "GUARDIAN_NO_EXIT=1"

REM Start the guardian with modified environment
start "" /MIN "%~dp0dist\extension-guardian-desktop.exe" --background --no-exit

REM Start the watchdog to ensure it keeps running
if exist "%~dp0dist\guardian_watchdog.exe" (
    start "" /MIN "%~dp0dist\guardian_watchdog.exe"
)

REM Create a persistent watchdog script
echo @echo off > "%TEMP%\guardian_forever.bat"
echo :restart >> "%TEMP%\guardian_forever.bat"
echo timeout /t 5 /nobreak > nul >> "%TEMP%\guardian_forever.bat"
echo tasklist /FI "IMAGENAME eq extension-guardian-desktop.exe" 2^>NUL ^| find /I /N "extension-guardian-desktop.exe" ^>nul >> "%TEMP%\guardian_forever.bat"
echo if "%%ERRORLEVEL%%"=="0" goto restart >> "%TEMP%\guardian_forever.bat"
echo echo Restarting Guardian... >> "%TEMP%\guardian_forever.bat"
echo start "" /MIN "%~dp0dist\extension-guardian-desktop.exe" --background --no-exit >> "%TEMP%\guardian_forever.bat"
echo goto restart >> "%TEMP%\guardian_forever.bat"

REM Start the persistent watchdog
start "" /MIN "%TEMP%\guardian_forever.bat"

echo Guardian started in protected mode.
echo The app is now running in the background and cannot be closed.
echo.
echo To verify it's running, check Task Manager for:
echo - extension-guardian-desktop.exe
echo.
timeout /t 5
