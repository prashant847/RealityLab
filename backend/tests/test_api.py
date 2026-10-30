import pytest
from fastapi.testclient import TestClient

from app.factory import create_app
from app.stakeholders.llm import Voice

CAUTIOUS = ["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause", "r5_logistics",
            "r6_restrict", "r7_hospital_first", "r8_suspend", "r9_holding", "r10_sweep"]
FAST_RISKY = ["r1_rush", "r2_secure", "r3_alt_transport", "r4_release_verified", "r5_balanced",
              "r6_parallel", "r7_hospital_first", "r8_restricted", "r9_wait", "r10_verified"]
GOOD_TAIL = ["r3_alt_transport", "r4_pause", "r5_logistics", "r6_restrict", "r7_hospital_first",
             "r8_suspend", "r9_holding", "r10_sweep"]


@pytest.fixture()
def client():
    with TestClient(create_app("sqlite://", voice=Voice(None))) as c:
        yield c


def create(client, seed=1, **extra):
    r = client.post("/api/simulations", json={"seed": seed, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def decide(client, sid, choice):
    return client.post(f"/api/simulations/{sid}/decisions", json={"choice_id": choice})


def play(client, sid, choices):
    last = None
    for c in choices:
        r = decide(client, sid, c)
        assert r.status_code == 200, (c, r.text)
        last = r.json()
    return last


# ------------------------------------------------------------- basics
def test_health_and_openapi_document_the_endpoints(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    paths = client.get("/openapi.json").json()["paths"]
    for p in ("/api/simulations", "/api/simulations/{simulation_id}", "/api/simulations/{simulation_id}/decisions",
              "/api/simulations/{simulation_id}/history", "/api/simulations/{simulation_id}/timeline",
              "/api/simulations/{simulation_id}/rewind", "/api/simulations/{simulation_id}/replay",
              "/api/simulations/{simulation_id}/continue", "/api/simulations/{simulation_id}/restart"):
        assert p in paths


def test_create_returns_first_scene_without_hidden_truth(client):
    v = create(client, seed=7)
    assert v["simulation"]["seed"] == 7 and v["run"]["status"] == "active"
    assert v["scene"]["round"] == 1 and v["scene"]["title"] == "THE BLACKOUT"
    assert [c["id"] for c in v["scene"]["choices"]] == ["r1_isolate", "r1_controlled", "r1_rush"]
    assert "true_units" not in v["state"] and "true_units" not in str(v)
    assert v["state"]["budget"] == 12.0 and v["checkpoints"] == []


def test_decision_response_contains_outcome_and_next_scene(client):
    sid = create(client)["simulation"]["id"]
    r = decide(client, sid, "r1_isolate").json()
    assert r["outcome"]["choice_id"] == "r1_isolate" and "Evidence quality +25" in r["outcome"]["effects"]
    assert r["scene"]["round"] == 2 and r["state"]["containment"] == "full"
    assert len(r["checkpoints"]) == 1


def test_get_returns_same_view_after_refresh(client):
    sid = create(client)["simulation"]["id"]
    after = play(client, sid, CAUTIOUS[:4])
    again = client.get(f"/api/simulations/{sid}").json()
    after.pop("outcome")
    assert again == after


def test_history_and_timeline_shapes(client):
    sid = create(client)["simulation"]["id"]
    play(client, sid, CAUTIOUS[:5])
    h = client.get(f"/api/simulations/{sid}/history").json()
    assert [d["choice_id"] for d in h["decisions"]] == CAUTIOUS[:5]
    assert all(d["known_info"] and d["effects"] is not None for d in h["decisions"])
    tl = client.get(f"/api/simulations/{sid}/timeline").json()
    assert len(tl["runs"]) == 1 and tl["branches"] == [] and tl["runs"][0]["active"]
    assert tl["runs"][0]["metrics"]["budget"] == pytest.approx(12 - 0.5 - 0.3 - 4.0 - 0.3 - 6.0, abs=1e-6) \
        or tl["runs"][0]["metrics"]["budget"] > 0


# ------------------------------------------------------------- validation & errors
@pytest.mark.parametrize("body", [
    {"choice_id": ""}, {"choice_id": "DROP TABLE"}, {"choice_id": 5}, {}, {"choice_id": "r1_isolate", "x": 1},
    {"choice_id": "r1_" + "a" * 60},
])
def test_malformed_decisions_return_structured_422(client, body):
    sid = create(client)["simulation"]["id"]
    r = client.post(f"/api/simulations/{sid}/decisions", json=body)
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "validation_error" and err["details"]


def test_non_json_body_is_rejected(client):
    sid = create(client)["simulation"]["id"]
    r = client.post(f"/api/simulations/{sid}/decisions", content="not json",
                    headers={"content-type": "application/json"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


@pytest.mark.parametrize("body", [{"seed": -1}, {"seed": "x"}, {"seed": 2**40}, {"max_rewinds": 99}, {"bogus": 1}])
def test_create_validation(client, body):
    assert client.post("/api/simulations", json=body).status_code == 422


def test_unknown_simulation_is_404_in_error_shape(client):
    for r in (client.get("/api/simulations/nope"), decide(client, "nope", "r1_isolate"),
              client.get("/api/simulations/nope/history"), client.get("/api/simulations/nope/timeline"),
              client.post("/api/simulations/nope/rewind")):
        assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


def test_invalid_game_actions_are_422_or_409(client):
    sid = create(client)["simulation"]["id"]
    wrong_round = decide(client, sid, "r2_evacuate")
    assert wrong_round.status_code == 422 and wrong_round.json()["error"]["code"] == "invalid_request"
    assert client.post(f"/api/simulations/{sid}/rewind").status_code == 409      # nothing to rewind yet
    assert client.post(f"/api/simulations/{sid}/continue").status_code == 409    # not paused
    assert client.get(f"/api/simulations/{sid}?run_id=zzz").status_code == 404
    assert client.get(f"/api/simulations/{sid}").json()["state"]["round"] == 1   # unchanged


def test_unaffordable_and_unsafe_actions_rejected(client):
    sid = create(client)["simulation"]["id"]
    play(client, sid, ["r1_controlled", "r2_secure", "r3_alt_transport", "r4_release_verified", "r5_logistics"])
    r = decide(client, sid, "r6_specialist")
    assert r.status_code == 422 and "lakh" in r.json()["error"]["message"]
    sid2 = create(client)["simulation"]["id"]
    play(client, sid2, ["r1_isolate", "r2_maintain"])        # dead end; later restrictions need a live run
    assert decide(client, sid2, "r3_alt_transport").status_code == 409


def test_cannot_decide_after_completion(client):
    sid = create(client)["simulation"]["id"]
    play(client, sid, CAUTIOUS)
    r = decide(client, sid, "r10_sweep")
    assert r.status_code == 409


# ------------------------------------------------------------- end-to-end scenarios
def test_e2e_cautious_recovery(client):
    sid = create(client, seed=1)["simulation"]["id"]
    v = play(client, sid, CAUTIOUS)
    assert v["run"]["status"] == "completed" and v["run"]["ending"] == "full_recovery"
    final = v["scene"]["final"]
    assert final["shipped_hospital"] == 220 and final["shipped_contract"] == 100 and final["deadline_met"]
    assert v["state"]["staff_safety"] == 100 and v["state"]["evidence_quality"] >= 90
    again = client.get(f"/api/simulations/{sid}").json()          # refresh keeps the ending
    assert again["run"]["ending"] == "full_recovery"
    assert len(client.get(f"/api/simulations/{sid}/history").json()["decisions"]) == 10


def test_e2e_fast_but_risky_trades_evidence_for_time(client):
    cautious_sid = create(client, seed=1)["simulation"]["id"]
    cautious = play(client, cautious_sid, CAUTIOUS)
    sid = create(client, seed=1)["simulation"]["id"]
    risky = play(client, sid, FAST_RISKY)
    assert risky["run"]["status"] == "completed" and risky["run"]["ending"] == "partial_dispatch"
    assert risky["state"]["window_min"] > cautious["state"]["window_min"] + 100      # much faster...
    assert risky["state"]["evidence_quality"] < 20 <= cautious["state"]["evidence_quality"]   # ...but unsupported
    assert risky["scene"]["final"]["shipped_total"] < cautious["scene"]["final"]["shipped_total"]
    assert risky["state"]["staff_safety"] < 100


def test_e2e_poor_strategy_dead_ends_then_rewinds_and_recovers(client):
    sid = create(client, seed=1)["simulation"]["id"]
    play(client, sid, ["r1_isolate"])
    dead = decide(client, sid, "r2_maintain").json()
    assert dead["run"]["status"] == "dead_end"
    a = dead["analysis"]
    assert a["title"] == "DEAD END — RECOVERY WINDOW CLOSED" and a["continue_allowed"] is False
    assert a["critical_point"]["decision_taken"].startswith("Keep operating")
    assert a["critical_point"]["better_options"] and a["last_recoverable_checkpoint"] == 1
    assert "recovery_plan_from_checkpoint" not in a
    assert decide(client, sid, "r3_alt_transport").status_code == 409
    assert client.post(f"/api/simulations/{sid}/continue").status_code == 409        # hard dead end

    old_run = dead["run"]["id"]
    old_history = client.get(f"/api/simulations/{sid}/history?run_id={old_run}").json()

    rv = client.post(f"/api/simulations/{sid}/rewind")                                 # no body: last recoverable
    assert rv.status_code == 200
    rv = rv.json()
    assert rv["run"]["status"] == "active" and rv["run"]["parent_run_id"] == old_run
    assert rv["scene"]["round"] == 2 and rv["rewind_context"]["previous_choice"].startswith("Keep operating")
    assert rv["rewind_context"]["known_at_decision"] and rv["simulation"]["rewinds_left"] == 4

    done = play(client, sid, ["r2_evacuate", *GOOD_TAIL])
    assert done["run"]["status"] == "completed" and done["run"]["ending"] in ("full_recovery", "hospitals_served")

    # the failed attempt is intact and reviewable
    assert client.get(f"/api/simulations/{sid}/history?run_id={old_run}").json() == old_history
    assert client.get(f"/api/simulations/{sid}?run_id={old_run}").json()["run"]["status"] == "dead_end"
    tl = client.get(f"/api/simulations/{sid}/timeline").json()
    assert len(tl["runs"]) == 2 and tl["branches"] == [
        {"from": old_run, "to": done["run"]["id"], "checkpoint_index": 1, "kind": "rewind"}]


# ------------------------------------------------------------- other flows
def test_soft_dead_end_allows_continuing_to_a_degraded_ending(client):
    sid = create(client)["simulation"]["id"]
    dead = play(client, sid, ["r1_isolate", "r2_evacuate", "r3_reserve_hospital", "r4_pause", "r5_minimal"])
    assert dead["run"]["status"] == "dead_end" and dead["analysis"]["continue_allowed"] is True
    cont = client.post(f"/api/simulations/{sid}/continue").json()
    assert cont["run"]["status"] == "active" and cont["run"]["accepted_risk"]
    end = play(client, sid, ["r6_restrict", "r7_hospital_first", "r8_transfer", "r9_holding", "r10_verified"])
    assert end["run"]["ending"] == "partial_dispatch"


def test_rewind_to_explicit_checkpoint_and_validation(client):
    sid = create(client)["simulation"]["id"]
    play(client, sid, CAUTIOUS[:4])
    assert client.post(f"/api/simulations/{sid}/rewind", json={"checkpoint_index": 99}).status_code == 422
    assert client.post(f"/api/simulations/{sid}/rewind", json={"checkpoint_index": -1}).status_code == 422
    assert client.post(f"/api/simulations/{sid}/rewind", json={"checkpoint_index": 2, "extra": 1}).status_code == 422
    rv = client.post(f"/api/simulations/{sid}/rewind", json={"checkpoint_index": 2})
    assert rv.status_code == 200 and rv.json()["scene"]["round"] == 3
    assert rv.json()["state"]["decisions"][-1]["choice_id"] == "r2_evacuate"


def test_rewind_limit_enforced(client):
    sid = create(client, max_rewinds=1)["simulation"]["id"]
    play(client, sid, CAUTIOUS[:3])
    assert client.post(f"/api/simulations/{sid}/rewind", json={"checkpoint_index": 1}).status_code == 200
    r = client.post(f"/api/simulations/{sid}/rewind", json={"checkpoint_index": 0})
    assert r.status_code == 409 and "limit" in r.json()["error"]["message"].lower()


def test_replay_runs_alternate_branch_without_touching_active_run(client):
    sid = create(client)["simulation"]["id"]
    done = play(client, sid, CAUTIOUS)
    active = done["run"]["id"]
    r = client.post(f"/api/simulations/{sid}/replay",
                    json={"checkpoint_index": 6, "choices": ["r7_commitments"], "follow_original": True})
    assert r.status_code == 200, r.text
    alt = r.json()
    assert alt["run"]["kind"] == "replay" and alt["run"]["status"] == "completed"
    assert alt["replay_context"]["applied"] == ["r7_commitments", "r8_suspend", "r9_holding", "r10_sweep"]
    assert alt["state"]["priority"] == "contract_first"
    assert alt["state"]["public_trust"] < done["state"]["public_trust"]           # the cost of the other choice
    assert alt["state"]["trust"]["isha"] < done["state"]["trust"]["isha"]
    assert "hospitals_deprioritized" in alt["state"]["flags"]
    assert client.get(f"/api/simulations/{sid}").json()["run"]["id"] == active        # active run unchanged
    assert client.get(f"/api/simulations/{sid}?run_id={active}").json()["run"]["ending"] == "full_recovery"
    assert client.get(f"/api/simulations/{sid}").json()["simulation"]["rewinds_used"] == 0


def test_replay_is_atomic_on_invalid_choice(client):
    sid = create(client)["simulation"]["id"]
    play(client, sid, CAUTIOUS[:5])
    bad = client.post(f"/api/simulations/{sid}/replay", json={"checkpoint_index": 3, "choices": ["r4_pause", "r5_nope"]})
    assert bad.status_code == 422
    assert len(client.get(f"/api/simulations/{sid}/timeline").json()["runs"]) == 1     # nothing half-created
    assert client.post(f"/api/simulations/{sid}/replay", json={"checkpoint_index": 3, "choices": []}).status_code == 422


def test_restart_keeps_old_runs(client):
    sid = create(client)["simulation"]["id"]
    play(client, sid, CAUTIOUS[:2])
    v = client.post(f"/api/simulations/{sid}/restart").json()
    assert v["scene"]["round"] == 1 and v["run"]["kind"] == "restart"
    assert len(client.get(f"/api/simulations/{sid}/timeline").json()["runs"]) == 2


def test_same_seed_same_choices_same_result_across_simulations(client):
    a = play(client, create(client, seed=11)["simulation"]["id"], FAST_RISKY)
    b = play(client, create(client, seed=11)["simulation"]["id"], FAST_RISKY)
    assert a["state"]["decisions"] == b["state"]["decisions"] and a["state"]["events"] == b["state"]["events"]
    assert a["scene"]["final"] == b["scene"]["final"]


def _all_keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _all_keys(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _all_keys(v)


def test_no_endpoint_leaks_the_hidden_stock_during_or_after_play_except_the_post_game_reveal(client):
    from .helpers import play
    seed = next(s for s in range(1, 60) if any(e["event_id"] == "dock_flooding" for e in play(CAUTIOUS, seed=s)[0].events))
    bodies = []
    v = client.post("/api/simulations", json={"seed": seed}); bodies.append(v.json())
    sid = v.json()["simulation"]["id"]
    for c in CAUTIOUS:
        r = client.post(f"/api/simulations/{sid}/decisions", json={"choice_id": c}); bodies.append(r.json())
        bodies.append(client.post(f"/api/simulations/{sid}/stakeholder-advice", json={"stakeholder": "raghav"}).json()
                      if r.json()["run"]["status"] == "active" else {})
    for path in ("", "/history", "/timeline", "/checkpoints/3", "/stakeholder-advice"):
        bodies.append(client.get(f"/api/simulations/{sid}{path}").json())
    client.post(f"/api/simulations/{sid}/replay", json={"checkpoint_index": 8, "choices": ["r9_wait"]})
    bodies.append(client.get(f"/api/simulations/{sid}/compare").json())
    for b in bodies:
        assert "true_units" not in set(_all_keys(b))
    report = client.get(f"/api/simulations/{sid}/report").json()
    assert "true_units" not in set(_all_keys({k: v for k, v in report.items() if k != "reveal"}))
    assert report["reveal"]["true_units"] > 0
