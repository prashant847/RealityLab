"""The Definition of Done, one test per item (see docs/TESTING.md). Everything goes through the public
HTTP API of a freshly built app, the way the frontend uses it; no engine internals except where noted."""
import json

import pytest
from fastapi.testclient import TestClient

from app.db.session import make_engine, make_session_factory
from app.engine import planner
from app.engine.state import WorldState
from app.factory import create_app
from app.scenario.pages import validate_page
from app.services.simulations import SimulationService
from app.stakeholders.llm import Voice

CAUTIOUS = ["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause", "r5_logistics", "r6_restrict",
            "r7_hospital_first", "r8_suspend", "r9_holding", "r10_sweep"]
FAST = ["r1_rush", "r2_secure", "r3_alt_transport", "r4_release_verified", "r5_balanced", "r6_parallel",
        "r7_hospital_first", "r8_restricted", "r9_wait", "r10_verified"]
SOFT = ["r1_isolate", "r2_evacuate", "r3_reserve_hospital", "r4_pause", "r5_minimal"]
SHORTFALL = ["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_release_verified", "r5_minimal", "r6_restrict",
             "r7_commitments", "r8_transfer", "r9_holding", "r10_verified"]   # stays viable until the last decisions


@pytest.fixture()
def client():
    with TestClient(create_app("sqlite://", Voice(None))) as c:
        yield c


def start(c, seed=1):
    r = c.post("/api/simulations", json={"seed": seed})
    assert r.status_code == 201
    return r.json()["simulation"]["id"], r.json()


def play(c, sid, choices):
    last = None
    for ch in choices:
        r = c.post(f"/api/simulations/{sid}/decisions", json={"choice_id": ch})
        assert r.status_code == 200, (ch, r.text)
        last = r.json()
    return last


def play_accepting_risk(c, sid, choices):
    """Like a player who clicks 'Continue despite the risk' whenever a soft dead end offers it."""
    last, accepted = None, 0
    for ch in choices:
        r = c.post(f"/api/simulations/{sid}/decisions", json={"choice_id": ch})
        if r.status_code == 409:
            cont = c.post(f"/api/simulations/{sid}/continue")
            assert cont.status_code == 200, cont.text
            accepted += 1
            r = c.post(f"/api/simulations/{sid}/decisions", json={"choice_id": ch})
        assert r.status_code == 200, (ch, r.text)
        last = r.json()
    return last, accepted


def keys(o):
    if isinstance(o, dict):
        for k, v in o.items():
            yield k
            yield from keys(v)
    elif isinstance(o, list):
        for v in o:
            yield from keys(v)


# 1. Start a new BLACKOUT simulation.
def test_01_start_a_new_simulation(client):
    sid, v = start(client)
    assert v["scene"]["title"] == "THE SCREENS GO DARK" and v["scene"]["clock"] == "Day 1 · 27 Jun" and v["run"]["status"] == "active"
    assert v["state"]["budget"] == 12.0 and len(v["scene"]["choices"]) == 3


# 2. Read the story through a cinematic comic interface (the backend half: every scene ships a valid comic page).
def test_02_every_scene_ships_a_valid_comic_page(client):
    sid, v = start(client)
    layouts = set()
    for ch in CAUTIOUS:
        page = v["scene"]["page"]
        assert validate_page(page) == [] and page["panels"]
        layouts.add(page["layout"])
        v = play(client, sid, [ch])
    assert layouts >= {"single", "two", "three", "revelation"}


# 3. Make decisions that update persistent backend state.
def test_03_decisions_update_persistent_state(client):
    sid, _ = start(client)
    v = play(client, sid, ["r1_isolate"])
    assert v["state"]["containment"] == "full" and v["state"]["budget"] == 11.5 and v["scene"]["round"] == 2
    assert client.get(f"/api/simulations/{sid}").json()["state"] == v["state"]
    assert [d["choice_id"] for d in client.get(f"/api/simulations/{sid}/history").json()["decisions"]] == ["r1_isolate"]


# 4. Experience different consequences based on earlier choices.
def test_04_earlier_choices_change_later_consequences(client):
    tail = CAUTIOUS[1:4]
    a, b = start(client, 3)[0], start(client, 3)[0]
    va, vb = play(client, a, ["r1_isolate", *tail]), play(client, b, ["r1_rush", *tail])
    assert va["state"]["evidence_quality"] != vb["state"]["evidence_quality"]
    ev = lambda v: {e["event_id"] for e in v["state"]["events"]}
    assert ev(va) != ev(vb)                                                    # same later choices, different events
    assert va["scene"]["info"] != vb["scene"]["info"]                          # and a different picture of the world


# 5. Interact with stakeholders who have distinct goals.
def test_05_stakeholders_give_distinct_advice(client):
    sid, _ = start(client)
    advice = {w: client.post(f"/api/simulations/{sid}/stakeholder-advice", json={"stakeholder": w}).json()
              for w in ("kavya", "arjun", "nisha", "raghav", "isha")}
    assert advice["raghav"]["recommendation"] == "r1_rush" and advice["arjun"]["recommendation"] == "r1_isolate"
    assert len({a["dialogue"] for a in advice.values()}) == 5
    assert len({a["role"] for a in advice.values()}) == 5
    assert {s["verdict"] for a in advice.values() for s in a["stances"]} >= {"support", "oppose"}


# 6. Reach different endings.
def test_06_different_endings_are_reachable(client):
    endings = {}
    for name, path in (("full", CAUTIOUS), ("partial", FAST), ("served", FAST[:9] + ["r10_sweep"]), ("shortfall", SHORTFALL)):
        sid, _ = start(client)
        v, _accepted = play_accepting_risk(client, sid, path)
        assert v["run"]["status"] == "completed", name
        endings[name] = v["run"]["ending"]
    assert endings == {"full": "full_recovery", "partial": "partial_dispatch", "served": "hospitals_served", "shortfall": "critical_shortfall"}
    sid, _ = start(client)
    assert play(client, sid, ["r1_isolate", "r2_maintain"])["run"]["status"] == "dead_end"      # and the dead end is its own outcome


# 7. Reach a genuine dead end when the objectives become infeasible.
def test_07_a_genuine_dead_end(client):
    sid, _ = start(client)
    v = play(client, sid, ["r1_isolate", "r2_maintain"])
    assert v["run"]["status"] == "dead_end" and v["analysis"]["severity"] == "hard"
    refused = client.post(f"/api/simulations/{sid}/decisions", json={"choice_id": "r3_alt_transport"})
    assert refused.status_code == 409                                         # the simulation is paused
    soft, _ = start(client)
    v2 = play(client, soft, SOFT)
    assert v2["run"]["status"] == "dead_end" and v2["analysis"]["severity"] == "soft" and v2["analysis"]["continue_allowed"]


# 8. Receive a factual explanation of the mistakes and causal chain.
def test_08_factual_explanation_from_recorded_data(client):
    sid, _ = start(client)
    a = play(client, sid, SOFT)["analysis"]
    assert a["title"] == "DEAD END — RECOVERY WINDOW CLOSED"
    assert any("170 cargo lots" in d["text"] and "220" in d["text"] for d in a["why_unrecoverable"])
    point = a["critical_point"]
    assert point["decision_taken"] == "Spend only the essentials and hold the rest"
    assert any("customers need 220" in k for k in point["known_at_time"])        # judged by what was known
    assert point["better_options"] and a["last_recoverable_checkpoint"] == 4
    text = json.dumps(a).lower()
    assert not any(w in text for w in ("stupid", "careless", "your fault", "incompetent"))


# 9. Rewind to a verified recoverable checkpoint.
def test_09_rewind_lands_on_a_verified_recoverable_checkpoint():
    svc = SimulationService(make_session_factory(make_engine("sqlite://")))
    sid = svc.create(seed=1)["simulation"]["id"]
    for c in SOFT:
        svc.decide(sid, c)
    v = svc.rewind(sid)
    from app.db.models import Run
    with svc.sf() as db:
        restored = WorldState.model_validate(db.get(Run, v["run"]["id"]).state)
    assert v["run"]["status"] == "active" and v["scene"]["round"] == 5
    assert planner.classify(restored)["status"] == "viable"                  # the planner proves a path still exists
    assert "Recovery effort left" in " ".join(v["rewind_context"]["known_at_decision"])


# 10. Make a different choice and continue.
def test_10_different_choice_then_finish(client):
    sid, _ = start(client)
    play(client, sid, SOFT)
    rv = client.post(f"/api/simulations/{sid}/rewind").json()
    assert rv["run"]["status"] == "active" and rv["scene"]["round"] == 5
    v = play(client, sid, ["r5_balanced", "r6_restrict", "r7_hospital_first", "r8_transfer", "r9_holding", "r10_sweep"])
    assert v["run"]["status"] == "completed" and v["run"]["ending"] in ("hospitals_served", "full_recovery")
    old = client.get(f"/api/simulations/{sid}", params={"run_id": rv["run"]["parent_run_id"]}).json()
    assert old["run"]["status"] == "dead_end"                                  # the failed attempt is still there


# 11. Compare the original and alternate timelines.
def test_11_compare_timelines(client):
    sid, _ = start(client)
    play(client, sid, FAST)
    client.post(f"/api/simulations/{sid}/replay", json={"checkpoint_index": 9, "choices": ["r10_sweep"]})
    c = client.get(f"/api/simulations/{sid}/compare").json()
    names = {m["metric"] for m in c["metrics"]}
    assert names >= {"delivery_completion", "budget_left", "staff_safety", "system_integrity", "verified_share", "public_trust", "time_left"}
    assert c["first_difference"] == 9 and c["base"]["ending"] != c["other"]["ending"] and c["same_seed"]


# 12. View a final report with transparent scoring.
def test_12_report_with_transparent_scoring(client):
    sid, _ = start(client)
    play(client, sid, CAUTIOUS)
    r = client.get(f"/api/simulations/{sid}/report").json()
    assert r["overall"]["score"] > 80 and len(r["categories"]) == 8
    assert abs(sum(c["weighted"] for c in r["categories"]) - r["overall"]["raw"]) < 0.2
    assert all(c["formula"] and c["inputs"] for c in r["categories"])
    assert {"strongest_decisions", "most_damaging_decisions", "avoidable_losses", "missed_opportunities",
            "recommended_alternatives"} <= set(r)


# 13. Refresh the browser (here: restart the whole application) and continue the active simulation.
def test_13_restart_the_application_and_carry_on(tmp_path):
    url = f"sqlite:///{(tmp_path / 'game.db').as_posix()}"
    app1 = create_app(url, Voice(None))
    with TestClient(app1) as c1:
        sid, _ = start(c1)
        before = play(c1, sid, CAUTIOUS[:4])
    app1.state.service.sf.kw["bind"].dispose()
    with TestClient(create_app(url, Voice(None))) as c2:
        after = c2.get(f"/api/simulations/{sid}").json()
        assert after["state"] == before["state"] and after["scene"] == before["scene"]
        done = play(c2, sid, CAUTIOUS[4:])
        assert done["run"]["ending"] == "full_recovery"


# 14. Run the basic application without an AI API key.
def test_14_no_api_key_needed(monkeypatch):
    for var in ("ANTHROPIC_API_KEY", "REALITYLAB_LLM_KEY"):
        monkeypatch.delenv(var, raising=False)
    with TestClient(create_app("sqlite://")) as c:                            # default voice: read from the environment
        sid, _ = start(c)
        a = c.post(f"/api/simulations/{sid}/stakeholder-advice", json={"stakeholder": "nisha"}).json()
        assert a["source"] == "policy" and a["note"] is None
        assert play(c, sid, CAUTIOUS)["run"]["status"] == "completed"


# Bonus invariants that cut across the list.
def test_the_hidden_stock_never_appears_during_play(client):
    sid, v = start(client)
    bodies = [v, play(client, sid, ["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause"])]
    bodies.append(client.get(f"/api/simulations/{sid}/history").json())
    assert all("true_units" not in set(keys(b)) for b in bodies)
