@echo off
rem RealityLab AI, developer mode: the desktop window shows the live dev site (http://localhost:5173), so saved changes appear at once.
rem Starts the web servers first if they are not already running.
powershell -NoProfile -Command "if (-not (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -WindowStyle Hidden cmd -ArgumentList '/c','D:\hi\scripts\serve-web.cmd'; for ($i=0; $i -lt 40; $i++) { Start-Sleep 1; try { Invoke-WebRequest http://localhost:5173/ -UseBasicParsing -TimeoutSec 2 | Out-Null; break } catch {} } }"
set REALITYLAB_DEV_URL=http://localhost:5173
cd /d D:\hi\desktop
start "" "D:\hi\desktop\node_modules\electron\dist\electron.exe" .
