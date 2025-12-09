# Chatbot API Test Script
$apiUrl = "https://api-massaa39s-projects.vercel.app/api/chatbot"

# Test 1: Simple greeting
Write-Host "=== Test 1: Simple Greeting ===" -ForegroundColor Cyan
$body1 = @{
    message = "こんにちは"
    sessionId = "test-$(Get-Random)"
} | ConvertTo-Json -Compress

$response1 = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body1 -ContentType "application/json; charset=utf-8"
Write-Host "Response: $($response1.response)" -ForegroundColor Green
Write-Host ""

# Test 2: RAG knowledge query
Write-Host "=== Test 2: RAG Knowledge Query ===" -ForegroundColor Cyan
$body2 = @{
    message = "暗黙知について教えてください"
    sessionId = "test-$(Get-Random)"
} | ConvertTo-Json -Compress

$response2 = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body2 -ContentType "application/json; charset=utf-8"
Write-Host "Response: $($response2.response)" -ForegroundColor Green
Write-Host ""

# Test 3: Service inquiry
Write-Host "=== Test 3: Service Inquiry ===" -ForegroundColor Cyan
$body3 = @{
    message = "ShinAIのサービスについて教えてください"
    sessionId = "test-$(Get-Random)"
} | ConvertTo-Json -Compress

$response3 = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body3 -ContentType "application/json; charset=utf-8"
Write-Host "Response: $($response3.response)" -ForegroundColor Green
Write-Host ""

Write-Host "=== All Tests Completed ===" -ForegroundColor Yellow
