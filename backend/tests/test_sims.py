"""Bhopal and hospital simulations: scenario integrity, determinism, meaningful consequences, persistence across restarts and reports."""
import itertools

import pytest
from fastapi.testclient import TestClient

from app.factory import create_app
from app.sims import engine as E
from app.sims.bhopal import BHOPAL
from app.sims.covid import COVID

SCENARIOS = [BHOPAL, COVID]


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.id)
def test_scenario_is_well_formed(sc):
    ids = {m.id for m in sc.meters}
    flags_set = {f for r in sc.rounds for c in r.choices for f in c.flags} | {f for e in sc.events for f in e.flags}
    for r in sc.rounds:
        assert {c.rating for c in r.choices} == {"strong", "mixed", "weak"}, r.id
        assert len({c.id for c in r.choices}) == len(r.choices)
        for c in r.choices:
            assert set(c.effects) <= ids and set(c.skills) <= set(E.SKILLS)
            assert c.consequence and c.lesson
    for e in sc.events:
        assert 1 <= e.at_round <= len(sc.rounds) and set(e.effects) <= ids
        for cond in e.conds:
            assert cond[0] in ("flag", "no_flag", "lt", "gte")
            if cond[0] in ("flag", "no_flag"): assert cond[1] in flags_set
            else: assert cond[1] in ids
    assert not sc.endings[-1].conds


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.id)
def test_engine_is_deterministic_and_does_not_mutate_input(sc):
    st = E.new_state(sc)
    snapshot = repr(st)
    a, _ = E.decide(sc, st, sc.rounds[0].choices[0].id)
    b, _ = E.decide(sc, st, sc.rounds[0].choices[0].id)
    assert repr(st) == snapshot and a == b


def _play(sc, picks):
    st = E.new_state(sc)
    for pick in picks:
        r = E.current_round(sc, st)
        st, _ = E.decide(sc, st, next(c.id for c in r.choices if c.rating == pick))
    return st


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.id)
def test_choices_lead_to_different_endings(sc):
    n = len(sc.rounds)
    endings = {_play(sc, [p] * n)["ending"] for p in ("strong", "mixed", "weak")}
    assert len(endings) == 3, endings


def test_every_ending_is_reachable():
    for sc in SCENARIOS:
        part = [r for r in sc.rounds if r.kind == "hypothetical"]
        base = [("strong") for r in sc.rounds if r.kind != "hypothetical"]
        seen = set()
        for combo in itertools.product(("strong", "mixed", "weak"), repeat=len(part)):
            seen.add(_play(sc, base + list(combo))["ending"])
        assert seen == {e.id for e in sc.endings}, (sc.id, seen)


def test_bhopal_history_cannot_change_the_plant():
    """Part 1 only moves the understanding meter; the fictional plant starts identically however you answered."""
    hist = [r for r in BHOPAL.rounds if r.kind == "documented"]
    for pick in ("strong", "weak"):
        st = _play(BHOPAL, [pick] * len(hist))
        assert {k: v for k, v in st["meters"].items() if k != "insight"} == {m.id: m.start for m in BHOPAL.meters if m.id != "insight"}


def test_invalid_and_finished():
    st = E.new_state(COVID)
    with pytest.raises(E.InvalidChoice):
        E.decide(COVID, st, "nope")
    done = _play(COVID, ["strong"] * len(COVID.rounds))
    with pytest.raises(E.Finished):
        E.decide(COVID, done, "c1_strong")


def test_report_is_generated_from_the_run():
    st = _play(COVID, ["strong", "weak"] * 4)
    rep = E.build_report(COVID, st)
    assert rep["summary"] == {"decisions": 8, "strong": 4, "mixed": 0, "weak": 4}
    assert len(rep["major_decisions"]) == 8 and rep["improve"] and rep["lessons"]
    assert all(0 <= s["percent"] <= 100 for s in rep["skills"])
    assert all(s["evidence"] for s in rep["skills"])
    best = _play(COVID, ["strong"] * 8); worst = _play(COVID, ["weak"] * 8)
    pct = lambda st: {s["id"]: s["percent"] for s in E.build_report(COVID, st)["skills"]}
    assert all(v == 100 for v in pct(best).values()) and all(v == 0 for v in pct(worst).values())


# ------------------------------------------------------------------------------------------------- API and persistence

@pytest.fixture
def db_url(tmp_path):
    return f"sqlite:///{(tmp_path / 'x.db').as_posix()}"


def _finish(c, sim, rating):
    v = c.post(f"/api/sims/{sim}/runs").json()
    run = v["run"]["id"]
    while v["run"]["status"] == "active":
        ch = next(x for x in v["scene"]["step"]["choices"] if x["id"].endswith("_" + rating))
        r = c.post(f"/api/runs/{run}/decisions", json={"choice_id": ch["id"]})
        assert r.status_code == 200, r.text
        v = r.json()["view"]
    return run, v


def test_library_lists_three_simulations_with_progress(db_url):
    with TestClient(create_app(db_url)) as c:
        lib = c.get("/api/library").json()
        assert [x["id"] for x in lib] == ["blackout", "bhopal", "covid"]
        assert all(x["status"] == "none" for x in lib)
        v = c.post("/api/sims/covid/runs").json()
        c.post(f"/api/runs/{v['run']['id']}/decisions", json={"choice_id": "c1_strong"})
        covid = next(x for x in c.get("/api/library").json() if x["id"] == "covid")
        assert covid["status"] == "active" and covid["progress"] == "Step 2 of 8"


def test_progress_survives_restart_and_report_is_stored(db_url):
    with TestClient(create_app(db_url)) as c:
        v = c.post("/api/sims/bhopal/runs").json()
        run = v["run"]["id"]
        c.post(f"/api/runs/{run}/decisions", json={"choice_id": "h1_strong"})
    with TestClient(create_app(db_url)) as c2:          # a fresh app on the same file = an application restart
        cur = c2.get("/api/sims/bhopal/runs/current").json()
        assert cur["run"]["id"] == run and cur["scene"]["round"] == 2 and len(cur["decisions"]) == 1
        run2, v = _finish(c2, "covid", "strong")
        assert v["scene"]["ending"]["id"] == "held"
    with TestClient(create_app(db_url)) as c3:
        rep = c3.get(f"/api/runs/{run2}/report").json()
        assert rep["outcome"]["id"] == "held" and rep["skills"] and rep["recommended_next"]["id"] != "covid"
        j = c3.get("/api/journey").json()
        assert j["completed"][0]["run_id"] == run2 and j["skills"]
        assert next(x for x in c3.get("/api/library").json() if x["id"] == "covid")["status"] == "completed"
        assert c3.get(f"/api/runs/{run}/report").status_code == 409   # unfinished


def test_errors(db_url):
    with TestClient(create_app(db_url)) as c:
        assert c.post("/api/sims/nope/runs").status_code == 404
        assert c.get("/api/sims/covid/runs/current").json() is None
        v = c.post("/api/sims/covid/runs").json()
        assert c.post(f"/api/runs/{v['run']['id']}/decisions", json={"choice_id": "x"}).status_code == 422
        run, _ = _finish(c, "covid", "weak")
        assert c.post(f"/api/runs/{run}/decisions", json={"choice_id": "c1_weak"}).status_code == 409


def test_new_run_closes_the_old_one_and_profile_roundtrips(db_url):
    with TestClient(create_app(db_url)) as c:
        a = c.post("/api/sims/bhopal/runs").json()["run"]["id"]
        b = c.post("/api/sims/bhopal/runs").json()["run"]
        assert b["attempt"] == 2 and c.get(f"/api/runs/{a}").json()["run"]["status"] == "abandoned"
        assert c.put("/api/profile", json={"name": "Asha", "large_text": True}).json() == {"name": "Asha", "large_text": True, "reduce_motion": False}
    with TestClient(create_app(db_url)) as c2:
        assert c2.get("/api/profile").json()["name"] == "Asha"


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.id)
def test_skill_points_never_reward_a_weaker_choice(sc):
    for r in sc.rounds:
        for s in {k for c in r.choices for k in c.skills}:
            v = [next(c for c in r.choices if c.rating == k).skills.get(s, 0) for k in ("strong", "mixed", "weak")]
            assert v[0] >= v[1] >= v[2] and v[0] > v[2], (r.id, s, v)
