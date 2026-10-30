# Starts the local ComfyUI server used to generate comic backgrounds (http://127.0.0.1:8188). Local only: no cloud, no keys.
# ComfyUI is installed in D:\ComfyUI (its own venv). Override with $env:COMFYUI_DIR.
param([switch]$LowVram)
$dir = if ($env:COMFYUI_DIR) { $env:COMFYUI_DIR } else { "D:\ComfyUI" }
if (-not (Test-Path "$dir\main.py")) { Write-Error "ComfyUI not found at $dir. See docs/COMFYUI.md"; exit 1 }
$env:TEMP = "D:\tmp"; $env:TMP = "D:\tmp"
$extra = @(); if ($LowVram) { $extra += "--lowvram" }
Set-Location $dir
& "$dir\venv\Scripts\python.exe" main.py --listen 127.0.0.1 --port 8188 @extra
