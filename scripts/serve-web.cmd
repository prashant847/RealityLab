@echo off
rem Serves the web version: backend on :8000 (with the offline voices) and the Vite dev server on :5173.
set REALITYLAB_VOICE_DIR=D:\hi\desktop\voice
start "RealityLab backend" /min cmd /c "cd /d D:\hi\backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "RealityLab web" /min cmd /c "cd /d D:\hi\frontend && npm.cmd run dev"
