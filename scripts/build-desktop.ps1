<#
 Builds the Windows installer for RealityLab AI:  powershell -ExecutionPolicy Bypass -File scripts\build-desktop.ps1
   1. frontend  : type-check, tests, production build           -> frontend\dist
   2. backend   : PyInstaller standalone service                -> desktop\build\backend-dist
   3. desktop   : Electron shell + NSIS installer               -> desktop\installer\RealityLab-AI-Setup-<version>.exe
 Needs: Node 20+, Python 3.10+ with backend\.venv (pip install -r backend\requirements.txt). Downloads Electron and NSIS on first run.
 Pass -SkipTests to skip the test suites.
#>
param([switch]$SkipTests)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Run($exe, $argList, $dir) {
  Push-Location $dir; try { & $exe @argList; if ($LASTEXITCODE -ne 0) { throw "$exe failed with exit code $LASTEXITCODE" } } finally { Pop-Location }
}

$py = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $py)) { throw "backend\.venv not found. Run: python -m venv backend\.venv; backend\.venv\Scripts\pip install -r backend\requirements.txt" }

if (-not (Test-Path "$root\desktop\voice\piper\piper.exe")) { Step "Natural read-aloud voice (one-time download)"; & powershell -NoProfile -ExecutionPolicy Bypass -File "$root\scripts\get-voice.ps1"; if ($LASTEXITCODE -ne 0) { throw "Voice download failed" } }

Step "1/3 Frontend"
if (-not (Test-Path "$root\frontend\node_modules")) { Run "npm.cmd" @("ci") "$root\frontend" }
if (-not $SkipTests) {
  Run "npm.cmd" @("test") "$root\frontend"
  Run $py @("-m", "pytest", "-q") "$root\backend"
}
Run "npm.cmd" @("run", "build") "$root\frontend"

Step "2/3 Backend service (PyInstaller)"
& $py -m pip show pyinstaller *> $null
if ($LASTEXITCODE -ne 0) { Run $py @("-m", "pip", "install", "pyinstaller") "$root\backend" }
Remove-Item -Recurse -Force "$root\desktop\build\backend-dist", "$root\desktop\build\pyi-work" -ErrorAction SilentlyContinue
Run $py @("-m", "PyInstaller", "--noconfirm", "--clean", "--name", "realitylab-server", "--onedir", "--console",
  "--distpath", "$root\desktop\build\backend-dist", "--workpath", "$root\desktop\build\pyi-work", "--specpath", "$root\desktop\build",
  "--paths", ".", "--collect-submodules", "uvicorn", "--collect-submodules", "sqlalchemy.dialects.sqlite", "--hidden-import", "app.main", "server_entry.py") "$root\backend"

Step "3/3 Desktop installer (Electron)"
$env:ELECTRON_CACHE = "$root\desktop\.cache\electron"
$env:ELECTRON_BUILDER_CACHE = "$root\desktop\.cache\builder"
if (-not (Test-Path "$root\desktop\node_modules\electron\dist")) {
  # the Electron download occasionally times out; retry a few times
  for ($i = 1; $i -le 3; $i++) { & npm.cmd install --prefix "$root\desktop" 2>&1 | Out-Host; if (Test-Path "$root\desktop\node_modules\electron\dist") { break } }
}
if (-not (Test-Path "$root\desktop\node_modules\electron\dist")) { throw "Electron did not install. Check your network and re-run." }
# Windows sometimes keeps a lock on a previous app.asar (antivirus or indexer); if the old output cannot be cleared, build into a fresh folder.
$outName = "installer"
Remove-Item -Recurse -Force "$root\desktop\$outName" -ErrorAction SilentlyContinue
if (Test-Path "$root\desktop\$outName") { $outName = "installer-" + (Get-Date -Format "yyyyMMdd-HHmmss"); Write-Host "Old output is locked; building into $outName" -ForegroundColor Yellow }
Run "npm.cmd" @("run", "dist", "--", "-c.directories.output=$outName") "$root\desktop"

$exe = Get-ChildItem "$root\desktop\$outName\RealityLab-AI-Setup-*.exe" | Select-Object -First 1
Write-Host "`nInstaller: $($exe.FullName)  ($([math]::Round($exe.Length / 1MB, 1)) MB)" -ForegroundColor Green
