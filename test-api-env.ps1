# Test script for Groq API functionality using environment variables
# This script reads the API key from .env file - NO HARDCODED SECRETS

Write-Host "🧪 Testing Groq API Connection..." -ForegroundColor Cyan

# Read API key from .env file
$envFile = ".\.env"
if (Test-Path $envFile) {
    Write-Host "📖 Reading API key from .env file..." -ForegroundColor Yellow
    $envContent = Get-Content $envFile
    $apiKey = ($envContent | Where-Object { $_ -match "^groq_api_key=" }) -replace "groq_api_key=", ""
    
    if ([string]::IsNullOrEmpty($apiKey)) {
        Write-Host "❌ No groq_api_key found in .env file" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ API key loaded from .env (length: $($apiKey.Length))" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "Please create a .env file with: groq_api_key=your_api_key_here" -ForegroundColor Yellow
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
    Write-Host "🌐 Sending request to Groq API..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body -TimeoutSec 30
    
    Write-Host "✅ Groq API Test Successful!" -ForegroundColor Green
    Write-Host "Response: $($response.choices[0].message.content)" -ForegroundColor White
    Write-Host "Model: $($response.model)" -ForegroundColor Gray
    Write-Host "Usage: $($response.usage)" -ForegroundColor Gray
    
    # Test semantic analysis
    Write-Host "`n🧪 Testing Semantic Analysis..." -ForegroundColor Cyan
    
    $semanticBody = @{
        model = "llama3-8b-8192"
        messages = @(
            @{
                role = "user"
                content = @"Analyze if this content is relevant for studying machine learning:

Content: "Learn about neural networks, backpropagation, and gradient descent in this comprehensive tutorial."

Study Topics: machine learning, AI, neural networks

Respond with JSON:
{
  "relevant": true/false,
  "score": 0.0-1.0,
  "reason": "Brief explanation"
}"@
            }
        )
        max_tokens = 100
        temperature = 0.3
        response_format = @{ type = "json_object" }
    } | ConvertTo-Json -Depth 10
    
    $semanticResponse = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $semanticBody -TimeoutSec 30
    $semanticResult = $semanticResponse.choices[0].message.content | ConvertFrom-Json
    
    Write-Host "✅ Semantic Analysis Test Successful!" -ForegroundColor Green
    Write-Host "Relevant: $($semanticResult.relevant)" -ForegroundColor White
    Write-Host "Score: $($semanticResult.score)" -ForegroundColor White
    Write-Host "Reason: $($semanticResult.reason)" -ForegroundColor Gray
    
    # Test named entity recognition
    Write-Host "`n🧪 Testing Named Entity Recognition..." -ForegroundColor Cyan
    
    $nerBody = @{
        model = "llama3-8b-8192"
        messages = @(
            @{
                role = "user"
                content = @"Extract named entities from this text:

Text: "Andrew Ng teaches machine learning at Stanford University and founded Coursera. His course covers neural networks and deep learning algorithms."

Respond with JSON:
{
  "persons": ["person1", "person2"],
  "organizations": ["org1", "org2"],
  "concepts": ["concept1", "concept2"],
  "locations": ["location1", "location2"]
}"@
            }
        )
        max_tokens = 100
        temperature = 0.1
        response_format = @{ type = "json_object" }
    } | ConvertTo-Json -Depth 10
    
    $nerResponse = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $nerBody -TimeoutSec 30
    $nerResult = $nerResponse.choices[0].message.content | ConvertFrom-Json
    
    Write-Host "✅ Named Entity Recognition Test Successful!" -ForegroundColor Green
    Write-Host "Persons: $($nerResult.persons -join ', ')" -ForegroundColor White
    Write-Host "Organizations: $($nerResult.organizations -join ', ')" -ForegroundColor White
    Write-Host "Concepts: $($nerResult.concepts -join ', ')" -ForegroundColor White
    Write-Host "Locations: $($nerResult.locations -join ', ')" -ForegroundColor Gray
    
    Write-Host "`n🎉 All AI tests passed! The extension should work correctly." -ForegroundColor Green
    
} catch {
    Write-Host "❌ API Test Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    }
    
    Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if the API key in .env is correct" -ForegroundColor Gray
    Write-Host "2. Verify internet connection" -ForegroundColor Gray
    Write-Host "3. Check Groq API status at https://status.groq.com" -ForegroundColor Gray
    Write-Host "4. Ensure you have sufficient API credits" -ForegroundColor Gray
}

Write-Host "`n📊 Test completed at $(Get-Date)" -ForegroundColor Cyan
Write-Host "✨ Security: No API keys were hardcoded in this script" -ForegroundColor Green
