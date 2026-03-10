@echo off
echo === Checking .crx file and permissions ===
echo.

set CRX_PATH=C:\ProgramData\MyProductivityExtension\extension.crx
set XML_PATH=C:\ProgramData\MyProductivityExtension\update.xml

echo 1. Checking if .crx file exists...
if exist "%CRX_PATH%" (
    echo    [OK] extension.crx exists
    dir "%CRX_PATH%" | findstr "extension.crx"
) else (
    echo    [ERROR] extension.crx NOT FOUND
)

echo.
echo 2. Checking if update.xml exists...
if exist "%XML_PATH%" (
    echo    [OK] update.xml exists
    type "%XML_PATH%"
) else (
    echo    [ERROR] update.xml NOT FOUND
)

echo.
echo 3. Checking file permissions...
icacls "%CRX_PATH%"

echo.
echo 4. Testing if Brave can access the file...
echo    Try to manually install by dragging extension.crx to brave://extensions
echo    Path: %CRX_PATH%
echo.

pause
