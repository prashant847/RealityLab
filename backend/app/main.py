"""ASGI entry point:  uvicorn app.main:app --port 8000

Serves the API at /api and, if the frontend has been built (npm run build), the game itself at /.
"""
from .factory import create_app

app = create_app(frontend_dir="auto")
