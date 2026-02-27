# Start AreoNet Backend
Write-Host "🚀 Starting AreoNet Backend..." -ForegroundColor Cyan

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

# Start FastAPI server
Write-Host "✅ Starting FastAPI on http://localhost:8000" -ForegroundColor Green
uvicorn main:app --reload --host 0.0.0.0 --port 8000
