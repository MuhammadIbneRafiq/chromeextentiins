@echo off
echo =========================================
echo Creating CLEAN extension folder
echo =========================================
echo.

set "SOURCE=c:\Users\wifi stuff\OneDrive - TU Eindhoven\chromeextentiins\src"
set "CLEAN=c:\Users\wifi stuff\OneDrive - TU Eindhoven\chromeextentiins\extension_clean"

REM Remove old clean folder if it exists
if exist "%CLEAN%" (
    echo Removing old clean folder...
    rmdir /s /q "%CLEAN%"
)

REM Create clean folder
echo Creating clean extension folder...
mkdir "%CLEAN%"

REM Copy ONLY necessary extension files
echo Copying manifest.json...
copy "%SOURCE%\manifest.json" "%CLEAN%\"

echo Copying folders...
if exist "%SOURCE%\icons" xcopy "%SOURCE%\icons" "%CLEAN%\icons\" /E /I /Y
if exist "%SOURCE%\background" xcopy "%SOURCE%\background" "%CLEAN%\background\" /E /I /Y
if exist "%SOURCE%\content" xcopy "%SOURCE%\content" "%CLEAN%\content\" /E /I /Y
if exist "%SOURCE%\popup" xcopy "%SOURCE%\popup" "%CLEAN%\popup\" /E /I /Y
if exist "%SOURCE%\rules" xcopy "%SOURCE%\rules" "%CLEAN%\rules\" /E /I /Y
if exist "%SOURCE%\analytics" xcopy "%SOURCE%\analytics" "%CLEAN%\analytics\" /E /I /Y
if exist "%SOURCE%\config" xcopy "%SOURCE%\config" "%CLEAN%\config\" /E /I /Y
if exist "%SOURCE%\utils" xcopy "%SOURCE%\utils" "%CLEAN%\utils\" /E /I /Y

REM Remove any Python/executable files that might have been copied
echo Cleaning up unwanted files...
del "%CLEAN%\*.py" 2>nul
del "%CLEAN%\*.bat" 2>nul
del "%CLEAN%\*.spec" 2>nul
del "%CLEAN%\*.exe" 2>nul
del "%CLEAN%\*.md" 2>nul
del "%CLEAN%\*.txt" 2>nul
del "%CLEAN%\popup\*.py" 2>nul
del "%CLEAN%\popup\*.spec" 2>nul
del "%CLEAN%\popup\*.exe" 2>nul
if exist "%CLEAN%\dist" rmdir /s /q "%CLEAN%\dist"
if exist "%CLEAN%\build" rmdir /s /q "%CLEAN%\build"

echo.
echo =========================================
echo Clean extension folder created at:
echo %CLEAN%
echo =========================================
echo.
echo Files in clean folder:
dir "%CLEAN%" /b
echo.
echo Done! Now pack this clean folder.
pause
