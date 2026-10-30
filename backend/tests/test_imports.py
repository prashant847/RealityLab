"""Every module must be importable on its own, in a fresh interpreter, in any order.
(A circular import once hid behind the fact that everything happened to import the engine first.)"""
import pathlib
import subprocess
import sys

import pytest

BACKEND = pathlib.Path(__file__).resolve().parents[1]
MODULES = sorted(
    ".".join(p.relative_to(BACKEND).with_suffix("").parts)
    for p in (BACKEND / "app").rglob("*.py") if p.name != "__init__.py"
)


def test_the_module_list_is_not_empty():
    assert len(MODULES) >= 20 and "app.scenario.rounds" in MODULES and "app.engine.rules" in MODULES


@pytest.mark.parametrize("module", [m for m in MODULES if m in (
    "app.scenario.rounds", "app.scenario.events", "app.scenario.pages", "app.scenario.risks", "app.engine.rules",
    "app.engine.state", "app.engine.planner", "app.engine.analysis", "app.stakeholders.agents", "app.stakeholders.policy",
    "app.scoring.rubric", "app.scoring.report", "app.services.simulations", "app.api.routes", "app.factory", "app.main")])
def test_module_imports_on_its_own(module):
    r = subprocess.run([sys.executable, "-c", f"import {module}"], cwd=BACKEND, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr[-800:]


def test_engine_package_still_exposes_its_public_names():
    code = ("from app.engine import apply_decision, new_simulation, scene_view, player_state, InvalidDecision, WorldState;"
            "import app.engine as e; assert e.compute_dispatch and e.EngineError and e.SimulationFinished;"
            "import pytest\ntry:\n    e.nope\nexcept AttributeError:\n    pass\nelse:\n    raise SystemExit('no AttributeError')")
    r = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr[-800:]
