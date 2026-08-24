@echo off
TITLE SSB AI Screening System Launcher
echo ============================================================
echo   SSB AI Border Screening System Launcher (SIH26188)
echo ============================================================
echo.

echo Starting Python FastAPI Backend Server on http://0.0.0.0:8000 ...
start "SSB AI Backend Server" cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Expo Web Frontend Application on http://localhost:8081 ...
start "SSB AI Web Frontend" cmd /k "npx expo start --web"

echo.
echo ============================================================
echo   Both services launched in separate windows!
echo   - Backend API:     http://127.0.0.1:8000/api/health
echo   - Web Application: http://localhost:8081
echo ============================================================
