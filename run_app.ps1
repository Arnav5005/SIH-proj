Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SSB AI Border Screening System Launcher (SIH26188)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting Python FastAPI Backend Server on http://0.0.0.0:8000..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Seconds 3

Write-Host "Starting Expo Web Frontend Application on http://localhost:8081..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k npm run web"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Both services launched in separate windows!" -ForegroundColor Yellow
Write-Host "  - Backend API:     http://127.0.0.1:8000/api/health (LAN accessible)" -ForegroundColor Yellow
Write-Host "  - Web Application: http://localhost:8081" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
