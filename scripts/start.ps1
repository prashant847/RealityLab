# Start the whole game as ONE process: the API and the built frontend on http://localhost:8000
#   powershell -ExecutionPolicy Bypass -File scripts\start.ps1 [-Port 8000]
param([int]$Port = 8000)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$root\backend\.venv\Scripts\python.exe")) {
    throw "The backend is not set up yet. Run:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1"
}
if (-not (Test-Path "$root\frontend\dist\index.html")) {
    Write-Host "The frontend has not been built yet; building it now..." -ForegroundColor Yellow
    Push-Location "$root\frontend"
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" } } finally { Pop-Location }
}
Write-Host "Starting BLACKOUT on http://localhost:$Port  (Ctrl+C to stop)" -ForegroundColor Green
Set-Location "$root\backend"
& .\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port $Port
