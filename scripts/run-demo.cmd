@echo off
rem Runs the demo branch on a separate demo database (your own runs are not touched): backend on :8000 and the web app on :5173.
rem First time only (or to reset the demo): run  backend\.venv\Scripts\python.exe backend\tools\seed_demo.py  once the backend is up.
set "REALITYLAB_VOICE_DIR=D:\hi\desktop\voice"
set "REALITYLAB_DB=sqlite:///D:/hi/backend/data/demo/demo.db"
if not exist "D:\hi\backend\data\demo" mkdir "D:\hi\backend\data\demo"
start "RealityLab demo backend" /min cmd /c "cd /d D:\hi\backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "RealityLab demo web" /min cmd /c "cd /d D:\hi\frontend && npm.cmd run dev"
