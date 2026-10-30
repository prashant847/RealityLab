"""The simulation engine package.

The public names below are re-exported lazily (PEP 562). The scenario modules import the small primitives in
`engine.rules`, and `engine.engine` imports the scenario, so eager re-exports here would make
`import app.scenario.rounds` (or any module imported before the engine) fail with a circular import.
"""
from .state import WorldState  # noqa: F401  (no scenario dependency)

_LAZY = ("EngineError", "InvalidDecision", "SimulationFinished", "apply_decision", "compute_dispatch",
         "new_simulation", "player_state", "scene_view")
__all__ = ["WorldState", *_LAZY]


def __getattr__(name: str):
    if name in _LAZY:
        from . import engine as _engine
        return getattr(_engine, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
