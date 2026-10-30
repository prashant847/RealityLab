# Development mode: backend with auto-reload on :8000 and the Vite dev server (hot reload) on :5173,
# each in its own window.   powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$root\backend\.venv\Scripts\python.exe")) {
    throw "The backend is not set up yet. Run:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1"
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"
Write-Host "Backend:  http://localhost:8000/docs   Frontend (play here in dev mode): http://localhost:5173" -ForegroundColor Green
