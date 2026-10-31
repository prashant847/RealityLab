"""Entry point for the packaged desktop app: starts the API (and the built frontend) on 127.0.0.1.

  realitylab-server.exe --port 51234
Reads REALITYLAB_DB (SQLite URL) and REALITYLAB_FRONTEND (folder with the built frontend) from the environment, which the desktop shell sets.
"""
import argparse
import os
import sys
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    url = os.environ.get("REALITYLAB_DB", "")
    if url.startswith("sqlite:///"):
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    import uvicorn
    from app.main import app
    # log_config=None: the windowed build has no console to write to
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_config=None, access_log=False)


if __name__ == "__main__":
    if sys.stdout is None: sys.stdout = open(os.devnull, "w")
    if sys.stderr is None: sys.stderr = open(os.devnull, "w")
    main()
