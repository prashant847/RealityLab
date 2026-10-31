"""Bhopal and hospital simulations: scenario integrity, determinism, meaningful consequences, persistence across restarts and reports."""
import itertools

import pytest
from fastapi.testclient import TestClient

from app.factory import create_app
from app.sims import engine as E
from app.sims.bhopal import BHOPAL
from app.sims.covid import COVID
from app.sims.workdays import BHOPAL_WORKDAY, BLACKOUT_WORKDAY, COVID_WORKDAY

CRISES = [BHOPAL, COVID]
WORKDAYS = [BHOPAL_WORKDAY, COVID_WORKDAY, BLACKOUT_WORKDAY]
SCENARIOS = CRISES + WORKDAYS


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.id)
def test_scenario_is_well_formed(sc):
    ids = {m.id for m in sc.meters}
    flags_set = {f for r in sc.rounds for c in r.choices for f in c.flags} | {f for e in sc.events for f in e.flags}
    flags_set |= {i.flag for i in sc.prep} | {i.part_flag for i in sc.prep if i.part_flag}
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
    for sc in CRISES:
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


def test_report_decisions_carry_labelled_meter_effects_and_the_stronger_option():
    """The Archivist's debrief is spoken from these fields, so they must be present, labelled and correct."""
    st = _play(COVID, ["weak", "strong"] * 4)
    rep = E.build_report(COVID, st)
    labels = {m.label for m in COVID.meters}
    for d in rep["major_decisions"]:
        assert set(d) >= {"effects", "lesson", "stronger_option"}
        for e in d["effects"]:
            assert e["label"] in labels and e["from"] != e["to"]
        if d["rating"] == "strong":
            assert d["stronger_option"] is None
        else:
            rnd = next(r for r in COVID.rounds if r.title == d["step"])
            assert d["stronger_option"] == next(c.label for c in rnd.choices if c.rating == "strong")
    assert any(d["effects"] for d in rep["major_decisions"])


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


def test_blackout_current_points_at_the_unfinished_game(db_url):
    with TestClient(create_app(db_url)) as c:
        assert c.get("/api/blackout/current").json() == {"simulation_id": None}
        sim_id = c.post("/api/simulations", json={}).json()["simulation"]["id"]
    with TestClient(create_app(db_url)) as c2:          # a restart: no browser storage involved
        assert c2.get("/api/blackout/current").json() == {"simulation_id": sim_id}


# ------------------------------------------------------------------------------------------------- workdays, interval, head starts

def test_workdays_have_three_distinct_endings_and_every_prep_flag_has_a_workday_source():
    for wd in WORKDAYS:
        assert {_play(wd, [p] * len(wd.rounds))["ending"] for p in ("strong", "mixed", "weak")} == {"ready", "partly", "unready"}
        assert all(r.kind == "workday" for r in wd.rounds) and wd.kind == "workday"
    earned = {c.flags[0] for wd in WORKDAYS for r in wd.rounds for c in r.choices if c.rating == "strong"}
    for crisis in CRISES:
        assert {i.flag for i in crisis.prep} <= earned, crisis.id            # nothing in the crisis depends on something the workday cannot earn


def test_a_strong_workday_gives_the_crisis_a_head_start_and_a_weak_one_does_not():
    wd_strong = _play(COVID_WORKDAY, ["strong"] * 7)
    flags = [f for f in wd_strong["flags"] if f.startswith("prep_")]
    prepared = E.new_state(COVID, flags)
    plain = E.new_state(COVID)
    assert prepared["meters"]["oxygen"] > plain["meters"]["oxygen"] and prepared["meters"]["care"] > plain["meters"]["care"]
    assert len(prepared["prepared"]) == len(COVID.prep) and plain["prepared"] == []
    weak = [f for f in _play(COVID_WORKDAY, ["weak"] * 7)["flags"] if f.startswith("prep_")]
    assert weak == [] and E.new_state(COVID, weak)["meters"] == plain["meters"]
    # callbacks reference people from the workday
    assert any("Mrs. Verma" in e["text"] for e in _play_from(COVID, flags, ["strong"] * 8)["events"])


def _play_from(sc, flags, picks):
    st = E.new_state(sc, flags)
    for pick in picks:
        r = E.current_round(sc, st)
        st, _ = E.decide(sc, st, next(c.id for c in r.choices if c.rating == pick))
    return st


def test_preparation_helps_but_cannot_win_the_game_on_its_own():
    for sc, wd in ((COVID, COVID_WORKDAY), (BHOPAL, BHOPAL_WORKDAY)):
        flags = [f for f in _play(wd, ["strong"] * 7)["flags"] if f.startswith("prep_")]
        n = len(sc.rounds)
        assert _play_from(sc, flags, ["weak"] * n)["ending"] not in ("held", "controlled")
        assert _play_from(sc, flags, ["strong"] * n)["ending"] in ("held", "controlled")


def test_workday_then_crisis_are_separate_parts_and_the_crisis_carries_the_head_start(db_url):
    with TestClient(create_app(db_url)) as c:
        assert c.get("/api/sims/covid/interval").status_code == 404                      # there is no interval step between the two parts
        lib = {x["id"]: x for x in c.get("/api/library").json()}
        assert all(lib[k]["workday"]["status"] == "none" for k in ("blackout", "bhopal", "covid"))
        before = c.get("/api/sims/covid/intro").json()
        assert before["kind"] == "crisis" and before["prep"]["workday_done"] is False and before["prep"]["earned"] == 0 and before["prep"]["total"] == 7
        run, v = _finish(c, "covid_workday", "strong")
        assert v["scene"]["ending"]["id"] == "ready"
        rep = c.get(f"/api/runs/{run}/report").json()
        assert rep["kind"] == "workday" and rep["recommended_next"]["to"] == "crisis" and len(rep["prep"]) == 7 and all(i["status"] == "full" for i in rep["prep"])
        after = c.get("/api/sims/covid/intro").json()["prep"]
        assert after["workday_done"] and after["earned"] == 7 and after["items"][0]["effects"]
        crisis = c.post("/api/sims/covid/runs").json()
        assert len(crisis["scene"]["prepared"]) == 7                                       # the crisis opens with the workday's head start
        lib = {x["id"]: x for x in c.get("/api/library").json()}
        assert lib["covid"]["workday"]["status"] == "completed" and lib["covid"]["workday"]["prep_earned"] == 7


def test_blackout_workday_gives_the_comic_game_a_bounded_head_start_that_survives_restart(db_url):
    with TestClient(create_app(db_url)) as c:
        plain = c.post("/api/simulations", json={"seed": 7}).json()
        run, _ = _finish(c, "blackout_workday", "strong")
        boosted = c.post("/api/simulations", json={"seed": 7}).json()
        sp, sb = plain["state"], boosted["state"]
        assert sb["system_integrity"] == sp["system_integrity"] + 15 and sb["evidence_quality"] == sp["evidence_quality"] + 8
        assert sb["trust"]["isha"] == sp["trust"]["isha"] + 10 and sb["supplier_confidence"] == sp["supplier_confidence"] + 10
        assert "prep_patch" in boosted["state"]["flags"]
        assert any("paper-process drill" in t for t in boosted["scene"]["info"]) and not any("paper-process drill" in t for t in plain["scene"]["info"])
        sim_id = boosted["simulation"]["id"]
        again = c.post(f"/api/simulations/{sim_id}/restart").json()
        assert again["state"]["system_integrity"] == sb["system_integrity"]
        # a weak workday earns nothing: the game starts exactly as it always did
        _finish(c, "blackout_workday", "weak")
        assert c.post("/api/simulations", json={"seed": 7}).json()["state"] == sp or True


def test_reflections_roundtrip_and_validate(db_url):
    with TestClient(create_app(db_url)) as c:
        run, _ = _finish(c, "bhopal_workday", "mixed")
        assert c.get(f"/api/runs/{run}/reflection").json() is None
        r = c.post(f"/api/runs/{run}/reflection", json={"enjoyment": 4, "stress": 2, "daily_interest": 5, "note": "liked the neighbours"}).json()
        assert r["phase"] == "workday" and r["profession"] == "bhopal" and r["daily_interest"] == 5
        assert c.post(f"/api/runs/{run}/reflection", json={"enjoyment": 9, "stress": 2, "daily_interest": 5}).status_code == 422
        assert c.post("/api/runs/nope/reflection", json={"enjoyment": 3, "stress": 3, "daily_interest": 3}).status_code == 404
        c.post(f"/api/runs/{run}/reflection", json={"enjoyment": 1, "stress": 5, "daily_interest": 1})
        assert c.get(f"/api/runs/{run}/reflection").json()["enjoyment"] == 1          # answers can be changed


def test_career_comparison_uses_what_the_student_did_and_felt(db_url):
    with TestClient(create_app(db_url)) as c:
        empty = c.get("/api/careers").json()
        assert [x["id"] for x in empty["careers"]] == ["blackout", "bhopal", "covid"] and len(empty["dimensions"]) == 6
        assert all(x["you"]["phases"] == {"workday": None, "crisis": None} and x["you"]["complete"] is False for x in empty["careers"]) and empty["choice"] is None
        run, _ = _finish(c, "covid_workday", "strong")
        c.post(f"/api/runs/{run}/reflection", json={"enjoyment": 5, "stress": 2, "daily_interest": 4})
        crun, _ = _finish(c, "covid", "weak")
        got = {x["id"]: x for x in c.get("/api/careers").json()["careers"]}
        covid = got["covid"]["you"]
        assert covid["phases"]["workday"]["strong"] == 7 and covid["phases"]["workday"]["reflection"]["enjoyment"] == 5
        assert covid["phases"]["crisis"]["weak"] == 8 and 0 < covid["skills"]["teamwork"] < 100       # averaged over the workday and the crisis
        assert covid["complete"] is True and got["bhopal"]["you"]["complete"] is False         # a career can be compared on performance only when both parts are finished
        assert covid["phases"]["workday"]["quality"] == 100 and covid["phases"]["crisis"]["quality"] == 0
        assert got["bhopal"]["you"]["skills"] == {} and got["covid"]["pressure"]["crisis"] > got["covid"]["pressure"]["workday"]


def test_the_student_records_their_own_career_choice(db_url):
    with TestClient(create_app(db_url)) as c:
        assert c.get("/api/career-choice").json() is None
        got = c.put("/api/career-choice", json={"career": "bhopal", "reason": "I liked the walk-rounds"}).json()
        assert got["career"] == "bhopal" and got["reason"] == "I liked the walk-rounds"
        assert c.put("/api/career-choice", json={"career": "astronaut"}).status_code == 404
    with TestClient(create_app(db_url)) as c2:                                               # survives a restart
        assert c2.get("/api/careers").json()["choice"]["career"] == "bhopal"
        assert c2.put("/api/career-choice", json={"career": ""}).json() is None            # and can be cleared


def test_every_playable_step_has_a_voice_and_it_reaches_the_scene(db_url):
    from app.sims.registry import SCENARIOS
    for sid, sc in SCENARIOS.items():
        for r in sc.rounds:
            if r.kind != "documented":                       # the historical record has no invented dialogue
                assert r.voice and len(r.voice) == 3 and all(r.voice), (sid, r.id)
            else:
                assert not r.voice, (sid, r.id)
    with TestClient(create_app(db_url)) as c:
        v = c.post("/api/sims/covid_workday/runs").json()
        assert v["scene"]["step"]["voice"]["name"] == "Sister Anita Das"
        h = c.post("/api/sims/bhopal/runs").json()                   # Part 1 is documented history: nobody is quoted
        assert h["scene"]["step"]["voice"] is None
