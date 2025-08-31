@echo off
echo 🤖 AI Guardian Auto Test Runner
echo ================================
echo.
echo Starting automated test suite...
echo.

REM Get the current directory
set "CURRENT_DIR=%~dp0"
set "TEST_FILE=%CURRENT_DIR%auto-test-runner.html"

REM Check if the test file exists
if not exist "%TEST_FILE%" (
    echo ❌ Error: auto-test-runner.html not found!
    echo Please make sure you're running this from the correct directory.
    pause
    exit /b 1
)

echo ✅ Test file found: %TEST_FILE%
echo.
echo 🚀 Opening test runner in your default browser...
echo.
echo 📋 Instructions:
echo 1. The test runner will open in your browser
echo 2. Click "Run All Tests" to start automated testing
echo 3. Watch the console for real-time results
echo 4. All tests will run automatically without manual intervention
echo.
echo 💡 Pro Tips:
echo - Keep the browser console open (F12) for detailed logs
echo - The extension popup will also show debug information
echo - Check the service worker console for background script logs
echo.

REM Open the test file in the default browser
start "" "%TEST_FILE%"

echo ✅ Test runner opened successfully!
echo.
echo 🎯 Next steps:
echo 1. Wait for the page to load completely
echo 2. Click "Run All Tests" button
echo 3. Watch the automated test results
echo 4. Check the summary at the bottom
echo.
echo 🔒 To test the new Focus Lock Timer functionality:
echo start "" "focus-lock-timer-tests.html"
echo.
echo Press any key to close this window...
pause >nul
