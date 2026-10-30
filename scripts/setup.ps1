# One-time setup: Python virtual environment + backend dependencies, frontend dependencies, frontend build.
# Run from anywhere:   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Invoke-Step($label, [scriptblock]$block) {
    Write-Host "==> $label" -ForegroundColor Cyan
    & $block
    if ($LASTEXITCODE -ne 0) { throw "Step failed: $label (exit code $LASTEXITCODE)" }
}

Push-Location "$root\backend"
try {
    if (-not (Test-Path ".venv\Scripts\python.exe")) { Invoke-Step "Creating Python virtual environment" { python -m venv .venv } }
    Invoke-Step "Installing backend dependencies" { & .\.venv\Scripts\python -m pip install --disable-pip-version-check -q -r requirements.txt }
} finally { Pop-Location }

Push-Location "$root\frontend"
try {
    Invoke-Step "Installing frontend dependencies" { npm install --no-audit --no-fund }
    Invoke-Step "Building the frontend" { npm run build }
} finally { Pop-Location }

Write-Host ""
Write-Host "Setup complete. Start the game with:  powershell -ExecutionPolicy Bypass -File scripts\start.ps1" -ForegroundColor Green
