<# Runs the desktop app from the source tree (no installer): builds the frontend, then opens the Electron window, which starts the backend itself. #>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location "$root\frontend"; npm.cmd run build; Pop-Location
$env:ELECTRON_CACHE = "$root\desktop\.cache\electron"
if (-not (Test-Path "$root\desktop\node_modules\electron\dist")) { npm.cmd install --prefix "$root\desktop" }
Push-Location "$root\desktop"; npm.cmd start; Pop-Location
