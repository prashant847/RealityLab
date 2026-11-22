from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.errors import install_error_handlers
from .api.routes import router
from .sims import models as _sim_models  # noqa: F401  (registers the tables before create_all)
from .sims.employers import EmployerService, Limiter, router as employers_router
from .sims.routes import router as sims_router
from .sims.service import SimsService
from .db.session import make_engine, make_session_factory
from .services.simulations import SimulationService
from .stakeholders.llm import Voice, provider_from_env

DESCRIPTION = """
Stateful crisis-simulation API for **BLACKOUT: The Last 24 Hours**. The backend is authoritative:
the frontend never computes outcomes. All characters and events are fictional.
"""

DEFAULT_FRONTEND = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def find_frontend(frontend_dir: Path | str | None) -> Path | None:
    """`None` disables serving. "auto" serves frontend/dist if it has been built (override with
    REALITYLAB_FRONTEND=<dir>, or REALITYLAB_FRONTEND=off to disable)."""
    if frontend_dir is None:
        return None
    if frontend_dir == "auto":
        env = os.environ.get("REALITYLAB_FRONTEND")
        if env and env.lower() in ("off", "0", "false", "none"):
            return None
        frontend_dir = Path(env) if env else DEFAULT_FRONTEND
    path = Path(frontend_dir)
    return path if (path / "index.html").is_file() else None


def create_app(db_url: str | None = None, voice: Voice | None = None,
               frontend_dir: Path | str | None = None) -> FastAPI:
    """Build the application. `db_url=None` uses the SQLite file (or $REALITYLAB_DB);
    pass "sqlite://" for a throwaway in-memory database. `voice=None` reads the optional LLM settings
    from the environment (no key = deterministic dialogue); tests pass an explicit Voice.
    `frontend_dir` serves a built frontend at "/" (see find_frontend); off unless asked for."""
    app = FastAPI(title="RealityLab AI", version="0.1.0", description=DESCRIPTION)
    sessions = make_session_factory(make_engine(db_url))
    app.state.service = SimulationService(sessions, voice or Voice(provider_from_env()))
    app.state.sims = SimsService(sessions)
    app.state.employers = EmployerService(app.state.sims)
    app.state.limiter = Limiter(limit=int(os.environ.get("REALITYLAB_RATE_LIMIT", "30")))      # per client, per minute, for sign-in, sign-up and code checks
    app.state.service.prep_provider = lambda: app.state.sims.latest_prep("blackout")   # a BLACKOUT game starts with its workday head start
    app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in os.environ.get("REALITYLAB_CORS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()],
                       allow_methods=["*"], allow_headers=["*"])
    install_error_handlers(app)
    app.include_router(router)
    app.include_router(sims_router)
    app.include_router(employers_router)
    dist = find_frontend(frontend_dir)
    if dist is not None:                         # mounted last, so every /api route wins
        app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
    return app
