#!/usr/bin/env pwsh
# Quick Deploy Script for Vercel

Write-Host "🚀 AreoNet Vercel Deployment Helper" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "⚠️  Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host "📦 Step 1: Deploy Frontend to Vercel" -ForegroundColor Green
Write-Host ""
Write-Host "This will deploy the Next.js frontend to Vercel."
Write-Host "You'll need to configure environment variables after deployment."
Write-Host ""

$deploy = Read-Host "Deploy now? (y/n)"
if ($deploy -eq 'y') {
    Set-Location DuneNet
    vercel --prod
    Set-Location ..
    
    Write-Host ""
    Write-Host "✅ Frontend deployed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚙️  Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Vercel dashboard → Your Project → Settings → Environment Variables"
    Write-Host "2. Add these variables:"
    Write-Host "   - NEXT_PUBLIC_API_URL=<your-railway-backend-url>"
    Write-Host "   - NEXTAUTH_URL=<your-vercel-frontend-url>"
    Write-Host "   - NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>"
    Write-Host "   - MONGODB_URI=mongodb+srv://palash9e_db_user:dB13Nr6JUWXIRSgy@cluster0.z59oimp.mongodb.net/dunenet"
    Write-Host ""
    Write-Host "3. Redeploy after adding variables: vercel --prod"
    Write-Host ""
}

Write-Host ""
Write-Host "📦 Step 2: Deploy Backend to Railway" -ForegroundColor Green
Write-Host ""
Write-Host "Options for backend deployment:" -ForegroundColor Cyan
Write-Host "  A. Railway (recommended) - https://railway.app"
Write-Host "  B. Render - https://render.com"
Write-Host "  C. Fly.io - https://fly.io"
Write-Host ""
Write-Host "Backend deployment requires:" -ForegroundColor Yellow
Write-Host "  1. Create account on chosen platform"
Write-Host "  2. Connect GitHub repository"
Write-Host "  3. Set root directory to 'backend/'"
Write-Host "  4. Platform will auto-detect Dockerfile"
Write-Host "  5. Upload model weights (latest_model_ft.pth) or use Git LFS"
Write-Host ""
Write-Host "See VERCEL_DEPLOYMENT.md for detailed instructions."
Write-Host ""

Write-Host "🎉 Deployment setup complete!" -ForegroundColor Green
Write-Host "📖 Read VERCEL_DEPLOYMENT.md for full instructions" -ForegroundColor Cyan
