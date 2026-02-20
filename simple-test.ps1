# Simple API test script - reads from .env file

Write-Host "🧪 Testing Groq API Connection..." -ForegroundColor Cyan

# Read API key from .env file
$envFile = ".\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $apiKey = ($envContent | Where-Object { $_ -match "^groq_api_key=" }) -replace "groq_api_key=", ""
    
    if ([string]::IsNullOrEmpty($apiKey)) {
        Write-Host "❌ No groq_api_key found in .env file" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ API key loaded from .env" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    exit 1
}

$apiUrl = "https://api.groq.com/openai/v1/chat/completions"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

$body = @{
    model = "llama3-8b-8192"
    messages = @(
        @{
            role = "user"
            content = "Hello! Please respond with exactly 'Groq API is working' to confirm the connection."
        }
    )
    max_tokens = 10
    temperature = 0.1
} | ConvertTo-Json -Depth 10

try {
    Write-Host "🌐 Testing API connection..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body -TimeoutSec 30
    
    Write-Host "✅ SUCCESS! Groq API is working!" -ForegroundColor Green
    Write-Host "Response: $($response.choices[0].message.content)" -ForegroundColor White
    Write-Host "Model: $($response.model)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ API Test Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "✨ Security: API key loaded from .env file - no hardcoded secrets" -ForegroundColor Green
