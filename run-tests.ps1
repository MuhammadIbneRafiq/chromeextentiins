# AI Guardian Auto Test Runner - PowerShell Version
# This script automatically opens the test runner in your default browser

Write-Host "🤖 AI Guardian Auto Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the current directory
$CurrentDir = Get-Location
$TestFile = Join-Path $CurrentDir "auto-test-runner.html"

Write-Host "📍 Current Directory: $CurrentDir" -ForegroundColor Yellow
Write-Host "🔍 Looking for test file: $TestFile" -ForegroundColor Yellow
Write-Host ""

# Check if the test file exists
if (-not (Test-Path $TestFile)) {
    Write-Host "❌ Error: auto-test-runner.html not found!" -ForegroundColor Red
    Write-Host "Please make sure you're running this from the correct directory." -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected location: $TestFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "✅ Test file found successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Opening test runner in your default browser..." -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "📋 Instructions:" -ForegroundColor White
Write-Host "1. The test runner will open in your browser" -ForegroundColor White
Write-Host "2. Click 'Run All Tests' to start automated testing" -ForegroundColor White
Write-Host "3. Watch the console for real-time results" -ForegroundColor White
Write-Host "4. All tests will run automatically without manual intervention" -ForegroundColor White
Write-Host ""

Write-Host "💡 Pro Tips:" -ForegroundColor Cyan
Write-Host "- Keep the browser console open (F12) for detailed logs" -ForegroundColor Cyan
Write-Host "- The extension popup will also show debug information" -ForegroundColor Cyan
Write-Host "- Check the service worker console for background script logs" -ForegroundColor Cyan
Write-Host ""

try {
    # Open the test file in the default browser
    Start-Process $TestFile
    Write-Host "✅ Test runner opened successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error opening test runner: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    
    try {
        # Alternative method using Invoke-Item
        Invoke-Item $TestFile
        Write-Host "✅ Test runner opened using alternative method!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to open test runner. Please open manually:" -ForegroundColor Red
        Write-Host "   $TestFile" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor White
Write-Host "1. Wait for the page to load completely" -ForegroundColor White
Write-Host "2. Click 'Run All Tests' button" -ForegroundColor White
Write-Host "3. Watch the automated test results" -ForegroundColor White
Write-Host "4. Check the summary at the bottom" -ForegroundColor White
Write-Host ""

Write-Host "🔧 To run tests manually:" -ForegroundColor Cyan
Write-Host "   Double-click: auto-test-runner.html" -ForegroundColor Gray
Write-Host "   Or drag the file into your browser" -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
