import json

import pytest
from sqlalchemy import func, select

from app.db.models import Checkpoint, DecisionRow, EventRow, Run
from app.db.session import make_engine, make_session_factory
from app.engine import planner
from app.engine.state import WorldState
from app.services.simulations import BadRequest, Conflict, NotFound, SimulationService

from .helpers import play

UNSAFE = ["r1_isolate", "r2_maintain"]
SOFT = ["r1_isolate", "r2_evacuate", "r3_reserve_hospital", "r4_pause", "r5_minimal"]
GOOD_TAIL = ["r3_alt_transport", "r4_pause", "r5_logistics", "r6_restrict", "r7_hospital_first",
             "r8_suspend", "r9_holding", "r10_sweep"]


@pytest.fixture()
def db_url(tmp_path):
    return f"sqlite:///{(tmp_path / 'sim.db').as_posix()}"


@pytest.fixture()
def svc():
    """In-memory database: fast. Persistence across restarts is tested separately with a real file."""
    return SimulationService(make_session_factory(make_engine("sqlite://")))


def run_choices(svc, sim_id, choices):
    view = None
    for c in choices:
        view = svc.decide(sim_id, c)
    return view


def new(svc, seed=1, **kw):
    return svc.create(seed=seed, **kw)["simulation"]["id"]


def count(svc, model, run_id):
    with svc.sf() as db:
        return db.scalar(select(func.count()).select_from(model).where(model.run_id == run_id))


# ---- 7. genuine dead ends ---------------------------------------------------
def test_unsafe_path_is_a_hard_dead_end_and_pauses_the_run(svc):
    sid = new(svc)
    v = run_choices(svc, sid, UNSAFE)
    assert v["run"]["status"] == "dead_end"
    a = v["analysis"]
    assert a["title"] == "DEAD END — RECOVERY WINDOW CLOSED"
    assert a["severity"] == "hard" and a["continue_allowed"] is False
    assert any("SAFETY FAILURE" in d["text"] for d in a["why_unrecoverable"])
    assert a["critical_point"]["decision_taken"].startswith("Keep working manually")
    with pytest.raises(Conflict):
        svc.decide(sid, "r3_alt_transport")
    with pytest.raises(Conflict):
        svc.continue_anyway(sid)


def test_soft_dead_end_when_hospital_capacity_can_no_longer_reach_need(svc):
    sid = new(svc)
    v = run_choices(svc, sid, SOFT)
    a = v["analysis"]
    assert v["run"]["status"] == "dead_end" and a["severity"] == "soft" and a["continue_allowed"]
    assert any(d["id"] == "transport" and "210" in d["text"] and "220" in d["text"] for d in a["why_unrecoverable"])
    assert "Transport capacity is below what time-critical customers need." in a["risks_not_addressed"]


def test_analysis_never_leaks_the_winning_plan(svc):
    sid = new(svc)
    v = run_choices(svc, sid, SOFT)
    assert "recovery_plan_from_checkpoint" not in v["analysis"]
    assert "plan" not in json.dumps(v["run"]) and "classification" not in v


# ---- 8. poor metrics are not dead ends -------------------------------------
def test_recovery_possible_despite_poor_metrics(svc):
    sid = new(svc)
    v = run_choices(svc, sid, ["r1_rush", "r2_secure", "r3_alt_transport", "r4_provisional"])
    st = v["state"]
    assert st["evidence_quality"] <= 30 and st["system_integrity"] < 40 and st["staff_safety"] < 100
    assert v["run"]["status"] == "active"
    state = WorldState.model_validate(svc._run.__self__.sf().__enter__().get(Run, v["run"]["id"]).state)
    assert planner.classify(state)["status"] == "viable"


def test_spending_most_of_the_budget_is_not_itself_a_dead_end(svc):
    sid = new(svc)
    v = run_choices(svc, sid, ["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause", "r5_balanced"])
    assert v["state"]["budget"] < 3 and v["run"]["status"] == "active"


def test_overcommitting_budget_early_can_genuinely_close_recovery(svc):
    # Same shape, but the heavy package leaves nothing for the capacity the depot scouts later remove.
    v = run_choices(svc, new(svc), ["r1_controlled", "r2_secure", "r3_divert_depot", "r4_release_verified",
                                    "r5_restoration"])
    a = v["analysis"]
    assert v["run"]["status"] == "dead_end"
    assert any(d["id"] in ("transport", "transport_budget") for d in a["why_unrecoverable"])
    assert a["last_recoverable_checkpoint"] == 4


# ---- 9. last recoverable checkpoint ---------------------------------------
def test_last_recoverable_checkpoint_is_the_decision_that_closed_the_window(svc):
    sid = new(svc)
    v = run_choices(svc, sid, SOFT)
    a = v["analysis"]
    assert a["last_recoverable_checkpoint"] == 4          # r5_minimal; reserving vehicles at r3 was still recoverable
    with svc.sf() as db:
        cps = {c.idx: WorldState.model_validate(c.state) for c in svc._checkpoints(db, v["run"]["id"])}
    assert planner.best_tier(cps[4]) >= 3                  # a plan existed there...
    chosen = next(c for c in a["contributing_decisions"] if c["kind"] == "closed_recovery_window")
    assert chosen["index"] == 4 and chosen["viable_alternatives"]
    assert chosen["known_at_time"]
    assert chosen["options_keeping_recovery_before"]["viable"] >= 1
    assert chosen["options_keeping_recovery_after"]["viable"] == 0


def test_earlier_reasonable_decision_is_not_blamed_as_fatal(svc):
    v = run_choices(svc, new(svc), SOFT)
    fatal = [c["index"] for c in v["analysis"]["contributing_decisions"] if c["kind"] == "closed_recovery_window"]
    assert fatal == [4]            # reserve_hospital (index 2) kept recovery possible; it is not "the" cause


# ---- checkpoint contents ----------------------------------------------------
def test_checkpoint_stores_everything_needed_to_resume(svc):
    sid = new(svc, seed=9)
    v = run_choices(svc, sid, ["r1_controlled", "r2_secure", "r3_divert_depot"])
    with svc.sf() as db:
        cp = svc._checkpoints(db, v["run"]["id"])[2]
    assert (cp.idx, cp.round, cp.seed, cp.replay_position) == (2, 3, 9, 2)
    assert cp.state["budget"] == pytest.approx(10.8) and len(cp.state["decisions"]) == 2
    assert {a["id"] for a in cp.available_actions} == {"r3_alt_transport", "r3_divert_depot", "r3_reserve_hospital"}
    assert any(e["event_id"] == "dock_flooding" for e in cp.event_queue)
    assert cp.resources["window_min"] == cp.state["window_min"]
    assert isinstance(cp.active_risks, list)


# ---- 10. rewind restores exact state ---------------------------------------
def test_rewind_restores_the_exact_checkpoint_state_and_explains_what_was_known(svc):
    sid = new(svc)
    dead = run_choices(svc, sid, SOFT)
    with svc.sf() as db:
        cp_state = svc._checkpoints(db, dead["run"]["id"])[4].state
    rv = svc.rewind(sid)                                     # defaults to the last recoverable checkpoint
    with svc.sf() as db:
        assert db.get(Run, rv["run"]["id"]).state == cp_state
    assert rv["run"]["status"] == "active" and rv["run"]["kind"] == "rewind"
    assert rv["scene"]["round"] == 5 and rv["run"]["branch_checkpoint_index"] == 4
    ctx = rv["rewind_context"]
    assert ctx["previous_choice"] == "Spend only the essentials and hold the rest"
    assert any("Recovery effort left" in x for x in ctx["known_at_decision"])
    assert rv["simulation"]["rewinds_used"] == 1 and rv["simulation"]["rewinds_left"] == 4


def test_rewind_context_separates_later_discoveries_from_known_facts(svc):
    sid = new(svc)
    run_choices(svc, sid, ["r1_rush", "r2_evacuate", "r3_alt_transport", "r4_pause", "r5_minimal", "r6_parallel"])
    rv = svc.rewind(sid, checkpoint_index=0)
    later = {e["title"] for e in rv["rewind_context"]["discovered_later"]}
    known = rv["rewind_context"]["known_at_decision"]
    assert later and not any(t in " ".join(known) for t in later)


# ---- 11. original branch preserved -----------------------------------------
def test_failed_run_stays_intact_after_rewinding(svc):
    sid = new(svc)
    dead = run_choices(svc, sid, SOFT)
    old_id = dead["run"]["id"]
    before = (count(svc, DecisionRow, old_id), count(svc, Checkpoint, old_id), count(svc, EventRow, old_id))
    snapshot = svc.history(sid, old_id)
    rv = svc.rewind(sid)
    run_choices(svc, sid, ["r5_balanced"])
    assert svc.history(sid, old_id) == snapshot
    assert (count(svc, DecisionRow, old_id), count(svc, Checkpoint, old_id), count(svc, EventRow, old_id)) == before
    old_view = svc.view(sid, old_id)
    assert old_view["run"]["status"] == "dead_end" and old_view["analysis"]["severity"] == "soft"
    runs = svc.runs(sid)
    assert [r["run_id"] for r in runs if r["parent_run_id"] == old_id] == [rv["run"]["id"]]
    assert sum(r["active"] for r in runs) == 1
    assert svc.view(sid)["run"]["id"] == rv["run"]["id"]


# ---- 12. determinism through rewind ----------------------------------------
def test_replaying_the_same_choice_after_rewind_reproduces_the_original(svc):
    sid = new(svc)
    dead = run_choices(svc, sid, SOFT)
    with svc.sf() as db:
        original = db.get(Run, dead["run"]["id"]).state
    svc.rewind(sid)
    redo = svc.decide(sid, "r5_minimal")
    assert redo["run"]["status"] == "dead_end"
    with svc.sf() as db:
        replay = db.get(Run, redo["run"]["id"]).state
    assert replay == original                       # same seed + same choices = identical world


# ---- 5/13/e2e: recovery, retries, limits -----------------------------------
def test_rewind_then_different_choice_then_finish(svc):
    sid = new(svc)
    run_choices(svc, sid, UNSAFE)
    rv = svc.rewind(sid)
    assert rv["run"]["branch_checkpoint_index"] == 1 and rv["scene"]["round"] == 2
    v = run_choices(svc, sid, ["r2_evacuate", *GOOD_TAIL])
    assert v["run"]["status"] == "completed" and v["run"]["ending"] in ("full_recovery", "hospitals_served")
    assert v["state"]["decisions"][0]["choice_id"] == "r1_isolate"     # history before the branch kept


def test_recovery_is_not_guaranteed_and_attempts_accumulate(svc):
    sid = new(svc, max_rewinds=2)
    run_choices(svc, sid, UNSAFE)
    svc.rewind(sid)
    again = run_choices(svc, sid, ["r2_evacuate", "r3_reserve_hospital", "r4_pause", "r5_minimal"])
    assert again["run"]["status"] == "dead_end"                         # a second, different mistake
    rv = svc.rewind(sid)
    assert rv["simulation"]["rewinds_left"] == 0
    run_choices(svc, sid, ["r5_balanced"])
    svc.decide(sid, "r6_restrict")
    with pytest.raises(Conflict, match="Rewind limit"):
        svc.rewind(sid, checkpoint_index=0)
    assert len(svc.runs(sid)) == 3


def test_continue_despite_risk_plays_out_a_degraded_ending(svc):
    sid = new(svc)
    run_choices(svc, sid, SOFT)
    v = svc.continue_anyway(sid)
    assert v["run"]["status"] == "active" and v["run"]["accepted_risk"]
    v = run_choices(svc, sid, ["r6_restrict", "r7_hospital_first", "r8_transfer", "r9_holding", "r10_verified"])
    assert v["run"]["status"] == "completed" and v["run"]["ending"] == "partial_dispatch"


def test_rewind_from_completed_run_for_counterfactual(svc):
    sid = new(svc)
    run_choices(svc, sid, ["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause", "r5_logistics",
                           "r6_restrict", "r7_commitments", "r8_suspend", "r9_holding", "r10_sweep"])
    rv = svc.rewind(sid, checkpoint_index=6)
    assert rv["scene"]["round"] == 7 and rv["run"]["kind"] == "rewind"
    assert svc.runs(sid)[0]["status"] == "completed"


def test_restart_creates_fresh_run_and_keeps_old_one(svc):
    sid = new(svc)
    run_choices(svc, sid, UNSAFE)
    v = svc.restart(sid)
    assert v["scene"]["round"] == 1 and v["run"]["kind"] == "restart" and v["simulation"]["rewinds_used"] == 0
    assert {r["status"] for r in svc.runs(sid)} == {"dead_end", "active"}


# ---- 14. persistence after restart -----------------------------------------
def test_state_survives_application_restart(db_url):
    e1 = make_engine(db_url)
    s1 = SimulationService(make_session_factory(e1))
    sid = new(s1, seed=5)
    run_choices(s1, sid, SOFT[:3])
    before = s1.view(sid)
    dead_sid = new(s1, seed=1)
    dead = run_choices(s1, dead_sid, UNSAFE)
    e1.dispose()

    s2 = SimulationService(make_session_factory(make_engine(db_url)))
    assert s2.view(sid) == before
    assert s2.view(dead_sid)["analysis"] == dead["analysis"]
    assert s2.decide(sid, "r4_pause")["scene"]["round"] == 5            # and play continues


# ---- transactional safety ---------------------------------------------------
def test_failed_decision_writes_nothing(svc, monkeypatch):
    sid = new(svc)
    svc.decide(sid, "r1_isolate")
    rid = svc.view(sid)["run"]["id"]
    before = (count(svc, DecisionRow, rid), count(svc, Checkpoint, rid), count(svc, EventRow, rid))
    state_before = svc.view(sid)["state"]

    def boom(*a, **k):
        raise RuntimeError("planner crashed")
    monkeypatch.setattr(planner, "classify", boom)
    with pytest.raises(RuntimeError):
        svc.decide(sid, "r2_evacuate")
    monkeypatch.undo()
    assert (count(svc, DecisionRow, rid), count(svc, Checkpoint, rid), count(svc, EventRow, rid)) == before
    assert svc.view(sid)["state"] == state_before
    assert svc.decide(sid, "r2_evacuate")["scene"]["round"] == 3        # still playable


# ---- 15. invalid requests ---------------------------------------------------
def test_invalid_requests_are_rejected_cleanly(svc):
    sid = new(svc)
    with pytest.raises(BadRequest):
        svc.decide(sid, "not_a_choice")
    with pytest.raises(BadRequest):
        svc.decide(sid, "r2_evacuate")                                   # wrong round
    with pytest.raises(NotFound):
        svc.view("missing")
    with pytest.raises(NotFound):
        svc.decide("missing", "r1_isolate")
    with pytest.raises(Conflict):
        svc.rewind(sid)                                                  # nothing to rewind to yet
    svc.decide(sid, "r1_isolate")
    with pytest.raises(BadRequest):
        svc.rewind(sid, checkpoint_index=7)
    with pytest.raises(Conflict):
        svc.continue_anyway(sid)                                         # not paused
    assert svc.view(sid)["state"]["round"] == 2                          # nothing corrupted


def test_service_matches_pure_engine(svc):
    sid = new(svc, seed=3)
    v = run_choices(svc, sid, GOOD_TAIL[:0] + ["r1_isolate", "r2_evacuate", *GOOD_TAIL])
    s, _ = play(["r1_isolate", "r2_evacuate", *GOOD_TAIL], seed=3)
    assert v["run"]["ending"] == s.ending
    assert v["state"]["budget"] == s.budget
