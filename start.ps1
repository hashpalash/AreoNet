# AreoNet Startup Script for Windows
Write-Host "🏜️  Starting AreoNet — Autonomous UGV Perception Platform" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env created" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Building and starting services..." -ForegroundColor Cyan
Write-Host ""

# Start docker-compose
docker-compose up --build

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "DuneNet is now running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
