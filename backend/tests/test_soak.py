"""Randomised end-to-end soak: simulated players make random choices, accept or refuse soft dead ends,
rewind, restart, ask for advice and open reports. Invariants are checked after every single step.

    default: 6 players (fast).   Longer:  set SOAK_RUNS=60   (PowerShell:  $env:SOAK_RUNS=60)
"""
import json
import os
import random

import pytest

from app.db.session import make_engine, make_session_factory
from app.scenario.pages import validate_page
from app.services.simulations import Conflict, SimulationService
from app.stakeholders.agents import STAKEHOLDER_IDS

RUNS = int(os.environ.get("SOAK_RUNS", "6"))
STATUSES = {"active", "dead_end", "completed", "superseded"}


def keys(o):
    if isinstance(o, dict):
        for k, v in o.items():
            yield k
            yield from keys(v)
    elif isinstance(o, list):
        for v in o:
            yield from keys(v)


def check_view(v):
    json.dumps(v)                                                              # serialisable
    assert "true_units" not in set(keys(v)), "hidden stock leaked"
    assert v["run"]["status"] in STATUSES
    st = v["state"]
    assert st["budget"] >= 0 and 0 <= st["staff_safety"] <= 100 and 0 <= st["public_trust"] <= 100
    assert len(st["decisions"]) <= 10 and v["scene"].get("round", 10) in range(1, 11)
    if v["run"]["status"] == "active":
        assert v["scene"]["choices"] and any(c["available"] for c in v["scene"]["choices"]), "player is stuck"
        assert validate_page(v["scene"]["page"]) == []
    if v["run"]["status"] == "dead_end":
        a = v["analysis"]
        assert a["title"].startswith("DEAD END") and a["why_unrecoverable"] and a["last_recoverable_checkpoint"] is not None
        assert "recovery_plan_from_checkpoint" not in a
    else:
        assert v["analysis"] is None


@pytest.mark.parametrize("player", range(RUNS))
def test_random_player_never_breaks_the_game(player):
    rng = random.Random(1000 + player)
    svc = SimulationService(make_session_factory(make_engine("sqlite://")))
    v = svc.create(seed=rng.randint(0, 2**31 - 1), max_rewinds=3)
    sid = v["simulation"]["id"]
    seen = {"dead_end": 0, "rewind": 0, "continue": 0, "advice": 0}
    for _ in range(60):
        check_view(v)
        status = v["run"]["status"]
        if status == "completed":
            break
        if status == "dead_end":
            seen["dead_end"] += 1
            options = ["rewind", "restart"] + (["continue"] * 2 if v["analysis"]["continue_allowed"] else [])
            act = rng.choice(options)
            if act == "continue":
                v = svc.continue_anyway(sid); seen["continue"] += 1
            elif act == "rewind":
                try:
                    v = svc.rewind(sid); seen["rewind"] += 1
                    assert v["run"]["status"] == "active" and v["rewind_context"]["known_at_decision"]
                except Conflict as e:                                           # rewind limit: the only allowed refusal
                    assert "limit" in str(e)
                    v = svc.restart(sid)
            else:
                v = svc.restart(sid)
            continue
        if rng.random() < 0.3:
            a = svc.advise(sid, rng.choice(STAKEHOLDER_IDS)); seen["advice"] += 1
            assert a["dialogue"] and a["source"] == "policy" and "true_units" not in set(keys(a))
        options = [c for c in v["scene"]["choices"] if c["available"]]
        v = svc.decide(sid, rng.choice(options)["id"])["outcome"] and svc.view(sid)
    else:
        pytest.fail("the player never finished in 60 steps")

    # a finished run always has a valid, deterministic report
    assert v["run"]["status"] == "completed"
    report = svc.report(sid)
    json.dumps(report)
    assert len(report["categories"]) == 8 and 0 <= report["overall"]["score"] <= 100
    assert report["reveal"]["true_units"] > 0 and report["decisions"] and len(report["decisions"]) == 10
    assert svc.report(sid) == report
    # and the full history of every attempt is still there
    for run in svc.runs(sid):
        assert svc.history(sid, run["run_id"])["decisions"] is not None
    if len(svc.runs(sid)) > 1:
        assert svc.compare(sid)["same_seed"]
