import inspect
import json

import pytest
from fastapi.testclient import TestClient

from app.db.models import Report
from app.db.session import make_engine, make_session_factory
from app.engine import new_simulation
from app.engine.state import WorldState
from app.factory import create_app
from app.scoring import rubric
from app.scoring import ratings as R
from app.services.simulations import BadRequest, Conflict, NotFound, SimulationService
from app.stakeholders.llm import Voice

from .helpers import CAUTIOUS, play

FAST = ["r1_rush", "r2_secure", "r3_alt_transport", "r4_release_verified", "r5_balanced",
        "r6_parallel", "r7_hospital_first", "r8_restricted", "r9_wait", "r10_verified"]
UNLUCKY_PATH = ["r1_controlled", "r2_secure", "r3_alt_transport", "r4_pause", "r5_minimal",
                "r6_restrict", "r7_hospital_first", "r8_suspend", "r9_holding", "r10_sweep"]


@pytest.fixture()
def svc():
    return SimulationService(make_session_factory(make_engine("sqlite://")))


def finish(svc, path, seed=1):
    sid = svc.create(seed=seed)["simulation"]["id"]
    for c in path:
        svc.decide(sid, c)
    return sid


# ============================================================================ rubric
def test_eight_required_categories_with_weights_that_sum_to_one():
    names = [c.name for c in rubric.CATEGORIES]
    assert names == ["Staff safety & risk management", "Inventory & evidence reliability", "Financial discipline",
                     "Recovery speed", "Delivery prioritization", "Stakeholder coordination", "Communication quality",
                     "Adaptability to new information"]
    assert sum(c.weight for c in rubric.CATEGORIES) == pytest.approx(1.0)
    assert all(c.formula and c.measures for c in rubric.CATEGORIES)


def test_every_formula_checked_by_hand():
    s = WorldState(staff_safety=80, evidence_quality=60, verified_units=180, budget=1.5, system_integrity=50,
                   recovery_progress=40, window_min=60, public_trust=70, hospital_need=220, contract_need=100)
    s.trust = {"kavya": 80, "arjun": 70, "nisha": 60, "raghav": 50, "isha": 40}
    s.flags = ["unsafe_ops", "factual_statement", "spent_heavy_early", "hospitals_deprioritized"]
    d = {"shipped_hospital": 110, "shipped_contract": 50, "deadline_met": True, "provisional_shortfall": 4}
    sc = rubric.category_scores(s, d, adaptability=75)
    assert sc["safety"] == pytest.approx(80 - 15)
    assert sc["inventory"] == pytest.approx(0.45 * 60 + 0.40 * (100 * 180 / 320) + 0.15 * (100 - 5 * 4))
    assert sc["finance"] == pytest.approx(50 + 50 * 0.5 - 15)
    assert sc["recovery"] == pytest.approx(0.5 * 50 + 0.3 * 40 + 0.2 * 50)
    assert sc["delivery"] == pytest.approx(100 * (0.7 * 0.5 + 0.3 * 0.5) - 10)
    assert sc["coordination"] == pytest.approx(60)
    assert sc["communication"] == pytest.approx(70 + 8)
    assert sc["adaptability"] == 75
    expected = sum(rubric.WEIGHTS[k] * v for k, v in sc.items())
    assert rubric.weighted(sc) == pytest.approx(expected)


def test_missed_deadline_zeroes_delivery_and_scores_stay_in_range():
    s = WorldState(window_min=-5)
    sc = rubric.category_scores(s, {"shipped_hospital": 220, "shipped_contract": 100, "deadline_met": False}, 100)
    assert sc["delivery"] == 0
    wild = WorldState(staff_safety=0, evidence_quality=0, budget=0, public_trust=100)
    wild.flags = ["unsafe_ops", "invoice_default", "penalty_unpaid", "spent_heavy_early", "silence"]
    assert all(0 <= v <= 100 for v in rubric.category_scores(wild).values())


def test_ending_caps_apply_and_say_why():
    high = {k: 95.0 for k in rubric.WEIGHTS}
    assert rubric.overall(high, "full_recovery") == (pytest.approx(95.0), None)
    score, why = rubric.overall(high, "safety_failure")
    assert score == 40 and "safety failure caps the overall score at 40" in why
    assert rubric.overall(high, "missed_dispatch")[0] == 35 and rubric.overall(high, "critical_shortfall")[0] == 60
    assert rubric.overall({k: 20.0 for k in rubric.WEIGHTS}, "safety_failure") == (pytest.approx(20.0), None)   # cap never raises


def test_bands():
    assert [rubric.band(x) for x in (95, 90, 80, 75, 65, 50, 39)] == ["Exemplary", "Exemplary", "Strong", "Strong", "Adequate", "Weak", "Poor"]


def test_scores_respond_in_the_right_direction():
    base = WorldState()
    for field, cat, better in (("staff_safety", "safety", 100), ("evidence_quality", "inventory", 90), ("budget", "finance", 5.0),
                               ("system_integrity", "recovery", 90), ("public_trust", "communication", 95)):
        worse = base.model_copy(update={field: 10 if field != "budget" else 0.0})
        good = base.model_copy(update={field: better})
        assert rubric.category_scores(good)[cat] > rubric.category_scores(worse)[cat], field


def test_scoring_code_never_involves_a_language_model():
    import app.scoring.rubric as r, app.scoring.ratings as ra, app.scoring.report as rp
    for mod in (r, ra, rp):
        src = inspect.getsource(mod)
        assert "stakeholders.llm" not in src and "Voice" not in src and "anthropic" not in src.lower()


def test_cautious_scores_far_above_fast_risky_and_unsafe_is_capped():
    a = rubric.overall(rubric.category_scores(play(CAUTIOUS)[0], play(CAUTIOUS)[0].final, 100), "full_recovery")[0]
    f = play(FAST)[0]
    b = rubric.overall(rubric.category_scores(f, f.final, 100), f.ending)[0]
    assert a > 80 and b < 65 and a - b > 20


# ============================================================================ ratings
@pytest.mark.parametrize("regret,label", [(0, "sound"), (0.34, "sound"), (0.35, "questionable"), (1.0, "questionable"), (1.01, "poor"), (3, "poor")])
def test_rating_thresholds(regret, label):
    assert R.classify(regret) == label


@pytest.mark.parametrize("rating,hind,expected", [("sound", 0, "as_expected"), ("sound", 1, "unlucky"), ("questionable", 0, "lucky"),
                                                  ("poor", 0, "lucky"), ("poor", 2, "as_expected"), ("questionable", 1, "as_expected")])
def test_outcome_versus_rating_matrix(rating, hind, expected):
    assert R.outcome_label(rating, hind) == expected


def test_worlds_differ_only_in_the_two_unknowns():
    s, _ = play(CAUTIOUS[:3])
    ws = R.worlds(s)
    assert len(ws) == R.WORLDS and ws[0].seed == s.seed and ws[0].true_units == s.true_units
    assert len({w.seed for w in ws}) == R.WORLDS and len({w.true_units for w in ws}) > 1
    for w in ws:
        assert (w.budget, w.flags, w.round, w.verified_units <= w.true_units) == (s.budget, s.flags, s.round, True)
    assert s.model_dump() == play(CAUTIOUS[:3])[0].model_dump()                    # original untouched


def test_unsafe_choice_is_rated_poor_and_every_advisor_warned_visibly():
    cp, _ = play(["r1_isolate"])
    r = R.rate_decision(cp, "r2_maintain")
    assert r["rating"] == "poor" and r["p_objective"] == 0.0 and r["p_best"] == 1.0
    assert {w["stakeholder"] for w in r["warned_by"]} == {"kavya", "arjun", "nisha", "raghav", "isha"}
    assert r["best_choice_id"] in ("r2_evacuate", "r2_secure") and "poor choice given what you knew" in r["verdict"]


def test_a_sound_choice_is_judged_sound_even_when_advisors_disagreed():
    cp = new_simulation(1)
    r = R.rate_decision(cp, "r1_isolate")
    assert r["rating"] == "sound" and r["p_objective"] == 1.0 and r["outcome"] == "as_expected"


def test_best_alternative_is_chosen_by_feasibility_then_readiness_not_list_order():
    cp, _ = play(["r1_isolate", "r2_evacuate", "r3_reserve_hospital", "r4_pause"])
    r = R.rate_decision(cp, "r5_minimal")
    assert r["rating"] == "questionable" and r["best_choice_id"] != "r5_minimal" and r["p_best"] > r["p_objective"]


# ============================================================================ report
def test_report_has_every_required_section(svc):
    r = svc.report(finish(svc, FAST))
    for key in ("overall", "categories", "decisions", "strongest_decisions", "most_damaging_decisions", "avoidable_losses",
                "unavoidable_losses", "missed_opportunities", "recovery_improvers", "recommended_alternatives", "focus_next",
                "attempts", "reveal", "dispatch", "ending", "quality"):
        assert key in r, key
    assert [c["id"] for c in r["categories"]] == [c.id for c in rubric.CATEGORIES]
    assert sum(c["weighted"] for c in r["categories"]) == pytest.approx(r["overall"]["raw"], abs=0.2)
    assert all(c["formula"] and c["inputs"] for c in r["categories"])
    assert 0 <= r["overall"]["score"] <= 100 and r["overall"]["band"] in ("Weak", "Adequate", "Poor", "Strong", "Exemplary")
    assert len(r["decisions"]) == 10 and all("_options" not in d and "_best_choice" not in d for d in r["decisions"])
    json.dumps(r)                                                             # fully serialisable


def test_report_is_deterministic_and_cached_and_survives_restart(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'r.db').as_posix()}"
    e1 = make_engine(url)
    s1 = SimulationService(make_session_factory(e1))
    sid = finish(s1, CAUTIOUS)
    first = s1.report(sid)
    import app.services.simulations as mod
    monkeypatch.setattr(mod, "build_report", lambda *a, **k: (_ for _ in ()).throw(AssertionError("recomputed")))
    assert s1.report(sid) == first
    with s1.sf() as db:
        assert db.query(Report).count() >= 1
    e1.dispose()
    s2 = SimulationService(make_session_factory(make_engine(url)))
    assert s2.report(sid) == first                                            # served from storage after "restart"


def test_same_choices_same_seed_give_an_identical_report(svc):
    a, b = svc.report(finish(svc, FAST, seed=9)), svc.report(finish(svc, FAST, seed=9))
    strip = lambda r: {k: v for k, v in r.items() if k not in ("run_id", "attempts", "simulation_id")}
    assert strip(a) == strip(b)


def test_unfinished_and_unknown_runs_get_clear_errors(svc):
    sid = svc.create(seed=1)["simulation"]["id"]
    with pytest.raises(Conflict, match="once a run is finished"):
        svc.report(sid)
    dead = finish(svc, ["r1_isolate", "r2_maintain"])
    with pytest.raises(Conflict):
        svc.report(dead)
    with pytest.raises(NotFound):
        svc.report("nope")
    with pytest.raises(NotFound):
        svc.report(sid, run_id="zzz")


def test_hidden_stock_is_revealed_only_in_the_finished_report(svc):
    sid = svc.create(seed=1)["simulation"]["id"]
    assert "true_units" not in json.dumps(svc.view(sid))
    r = svc.report(finish(svc, FAST))
    assert r["reveal"]["true_units"] == r["reveal"]["recorded_units"] - r["reveal"]["records_overstated_by"] > 0
    assert r["reveal"]["existing_but_unverified"] > 0 and "Revealed only now" in r["reveal"]["note"]


def test_warned_choices_that_cost_points_are_called_out_with_the_advisors_alternative(svc):
    r = svc.report(finish(svc, FAST))
    d0 = r["decisions"][0]
    assert d0["choice_id"] == "r1_rush" and d0["rating"] == "sound" and d0["impact"]["score_delta"] < 0
    assert {w["stakeholder"] for w in d0["warned_by"]} == {"arjun", "nisha"}
    assert "warned against it" in d0["verdict"] and "Arjun and Nisha" in d0["verdict"]
    assert d0["alternative"]["choice_id"] == "r1_isolate" and "Arjun" in d0["alternative"]["recommended_by"]
    assert d0["alternative"]["differences"]
    assert 0 in r["most_damaging_decisions"]


def test_questionable_final_dispatch_names_the_better_option(svc):
    r = svc.report(finish(svc, FAST))
    last = r["decisions"][9]
    assert last["rating"] == "questionable" and last["alternative"]["choice_id"] == "r10_sweep"
    alts = {a["index"]: a for a in r["recommended_alternatives"]}
    assert 9 in alts and len(r["recommended_alternatives"]) <= 5


def test_losses_are_traced_to_the_last_decision_that_could_have_prevented_them(svc):
    r = svc.report(finish(svc, FAST))
    loss = next(x for x in r["avoidable_losses"] if x["event"] == "Systems fail again")
    assert loss["caused_by"]["index"] == 0 and loss["alternative"] == "Isolate affected systems and preserve evidence"
    assert loss["avoidable"] and not loss["chance"] and loss["probability"] == 0.8
    assert loss["earlier_chances"] == []                                     # nothing before decision 1 could have helped
    power = next((x for x in r["avoidable_losses"] if x["event"] == "Backup power dips"), None)
    if power:
        assert power["caused_by"]["index"] == 7 and "Suspend" in power["alternative"]


def test_chance_only_events_are_not_blamed_on_the_player(svc):
    seed = next(s for s in range(1, 60) if any(e["event_id"] == "dock_flooding" for e in play(CAUTIOUS, seed=s)[0].events))
    r = svc.report(finish(svc, CAUTIOUS, seed=seed))
    flood = next(x for x in r["unavoidable_losses"] if x["event"] == "Water at the loading dock")
    assert flood["chance"] and flood["caused_by"] is None and flood["probability"] == 0.5 and not flood["avoidable"]
    assert flood["kind"] == "stock" and flood["amount"] == 20


def test_a_sound_unwarned_choice_hit_by_a_chance_event_is_called_unlucky(svc):
    fires = lambda s: any(e["event_id"] == "panel_failure_assessed" for e in play(UNLUCKY_PATH, seed=s)[0].events)
    bad_seed = next(s for s in range(1, 80) if fires(s))
    calm_seed = next(s for s in range(1, 80) if not fires(s))
    r = svc.report(finish(svc, UNLUCKY_PATH, seed=bad_seed))
    d = r["decisions"][1]
    assert d["choice_id"] == "r2_secure" and d["rating"] == "sound" and d["outcome"] == "unlucky"
    assert d["bad_luck"] == ["The panel fails during assessment"] and "chance intervened" in d["verdict"] and not d["warned_by"]
    assert r["quality"]["unlucky"] >= 1 and r["quality"]["poor"] == 0
    calm = svc.report(finish(svc, UNLUCKY_PATH, seed=calm_seed))              # same decisions, kinder dice
    assert calm["decisions"][1]["outcome"] == "as_expected" and calm["decisions"][1]["bad_luck"] == []
    assert abs(r["overall"]["score"] - calm["overall"]["score"]) < 3          # luck barely moves the score of sound play


def test_bad_luck_is_pinned_on_the_decision_that_created_the_exposure_not_the_next_one(svc):
    r = svc.report(finish(svc, FAST))
    d9, d8 = r["decisions"][8], r["decisions"][7]
    assert d9["choice_id"] == "r9_wait" and d9["bad_luck"] == [] and d9["outcome"] != "unlucky"
    assert d8["choice_id"] == "r8_restricted" and d8["bad_luck"] == ["Backup power dips"]


def test_opportunities_only_mention_things_that_applied_to_this_run(svc):
    r = svc.report(finish(svc, FAST))                                          # never diverted through the depot
    assert "alternate depot" not in " ".join(m["text"] for m in r["missed_opportunities"])


def test_a_decision_that_did_not_enable_an_event_is_not_blamed_for_it(svc):
    r = svc.report(finish(svc, FAST))
    for loss in r["avoidable_losses"]:
        for e in loss["earlier_chances"]:
            assert e["index"] < loss["caused_by"]["index"]
    power = next(x for x in r["avoidable_losses"] if x["event"] == "Backup power dips")
    assert power["caused_by"]["index"] == 7 and power["earlier_chances"] == []


def test_missed_opportunities_depend_on_what_actually_happened(svc):
    weak = svc.report(finish(svc, FAST))
    texts = " ".join(m["text"] for m in weak["missed_opportunities"])
    assert "insurer advance" in texts and "units short for hospitals" in texts and "binding limit was verified stock" in texts
    strong = svc.report(finish(svc, CAUTIOUS))
    assert "insurer advance" not in " ".join(m["text"] for m in strong["missed_opportunities"])


def test_focus_areas_come_from_the_weakest_categories(svc):
    r = svc.report(finish(svc, FAST))
    weakest = sorted((c for c in r["categories"] if c["id"] != "adaptability"), key=lambda c: c["score"])[:2]
    assert [f["category"] for f in r["focus_next"]] == [c["name"] for c in weakest if c["score"] < 85]
    assert all(f["advice"] for f in r["focus_next"])


def test_decisions_that_improved_recovery_are_listed(svc):
    r = svc.report(finish(svc, FAST))
    for i in r["recovery_improvers"]:
        assert r["decisions"][i]["impact"]["recovery_gain"] >= 5


# ============================================================================ attempts / progress
def test_report_shows_progress_across_attempts(svc):
    sid = svc.create(seed=1)["simulation"]["id"]
    svc.decide(sid, "r1_isolate")
    svc.decide(sid, "r2_maintain")                                            # dead end
    svc.rewind(sid)
    for c in ["r2_evacuate", *CAUTIOUS[2:]]:
        svc.decide(sid, c)
    r = svc.report(sid)
    a1, a2 = r["attempts"]
    assert (a1["attempt"], a1["status"], a1["score"]) == (1, "dead_end", None)
    assert a1["quality"]["poor"] == 1 and a1["decisions"] == 2
    assert (a2["attempt"], a2["status"]) == (2, "completed") and a2["score"] == r["overall"]["score"] > 80
    assert a2["quality"]["poor"] == 0 and a2["quality"]["sound"] == 10 and a2["active"] and not a1["active"]


# ============================================================================ comparison
def test_replay_comparison_isolates_the_effect_of_one_decision(svc):
    sid = finish(svc, FAST)
    svc.replay(sid, 9, ["r10_sweep"])
    c = svc.compare(sid)
    assert c["same_seed"] and c["first_difference"] == 9 and c["branch"] == {"other_branched_from_base": True, "checkpoint_index": 9}
    m = {r["metric"]: r for r in c["metrics"]}
    assert m["hospital_shipped"]["base"] == 170 and m["hospital_shipped"]["other"] == 220 and m["hospital_shipped"]["favours"] == "other"
    assert m["time_left"]["delta"] == -30 and m["time_left"]["favours"] == "base"          # the sweep costs time
    assert m["staff_safety"]["favours"] == "same" and m["evidence_quality"]["delta"] == 0
    assert c["base"]["ending"] == "Partial dispatch".upper() and c["other"]["ending"] == "HOSPITALS SERVED"
    assert m["overall_score"]["other"] > m["overall_score"]["base"]
    assert c["favours_count"]["other"] > c["favours_count"]["base"]
    assert [t["diverged"] for t in c["timeline"]] == [False] * 9 + [True] and all(t["same_choice"] for t in c["timeline"][:9])
    assert c["timeline"][9]["base"]["label"] != c["timeline"][9]["other"]["label"]
    assert all(t["other"]["readiness_after"] is not None for t in c["timeline"])


def test_comparison_lists_all_required_measures(svc):
    sid = finish(svc, FAST)
    svc.replay(sid, 0, ["r1_isolate"], follow_original=True)
    c = svc.compare(sid)
    assert {r["metric"] for r in c["metrics"]} >= {"delivery_completion", "budget_left", "staff_safety", "system_integrity",
                                                     "recovery_progress", "verified_share", "evidence_quality", "public_trust",
                                                     "time_left", "overall_score"}
    assert "critical_events" in c["base"] and "ending" in c["other"] and c["first_difference"] == 0
    assert c["base"]["critical_events"] != c["other"]["critical_events"] or c["base"]["critical_events"] == []


def test_comparing_a_dead_end_with_a_recovery(svc):
    sid = svc.create(seed=1)["simulation"]["id"]
    svc.decide(sid, "r1_isolate"); svc.decide(sid, "r2_maintain")
    svc.rewind(sid)
    for c in ["r2_evacuate", *CAUTIOUS[2:]]:
        svc.decide(sid, c)
    c = svc.compare(sid)
    assert c["base"]["status"] == "dead_end" and c["other"]["status"] == "completed"
    assert c["base"]["ending"].startswith("Dead end") and c["base"]["metrics"]["delivery_completion"] is None
    row = next(r for r in c["metrics"] if r["metric"] == "delivery_completion")
    assert row["delta"] is None and row["favours"] is None
    assert c["first_difference"] == 1


def test_compare_defaults_and_errors(svc):
    sid = svc.create(seed=1)["simulation"]["id"]
    with pytest.raises(BadRequest, match="only one run"):
        svc.compare(sid)
    svc.decide(sid, "r1_isolate")
    svc.restart(sid)
    c = svc.compare(sid)                                                       # newest vs previous
    assert c["other"]["decisions"] == 0 and c["base"]["decisions"] == 1
    runs = [r["run_id"] for r in svc.runs(sid)]
    with pytest.raises(BadRequest):
        svc.compare(sid, runs[0], runs[0])
    with pytest.raises(NotFound):
        svc.compare(sid, "bad", runs[0])


# ============================================================================ checkpoints
def test_checkpoint_view_shows_what_was_known_and_which_option_was_taken(svc):
    sid = finish(svc, CAUTIOUS[:4])
    v = svc.checkpoint_view(sid, 2)
    assert v["round"] == 3 and v["chosen_choice_id"] == "r3_alt_transport"
    assert [c["id"] for c in v["choices"] if c["chosen"]] == ["r3_alt_transport"] and len(v["choices"]) == 3
    assert any("hospitals together need" in k for k in v["known_info"]) and "true_units" not in json.dumps(v)
    with pytest.raises(BadRequest):
        svc.checkpoint_view(sid, 9)


# ============================================================================ API
@pytest.fixture()
def client():
    with TestClient(create_app("sqlite://", voice=Voice(None))) as c:
        yield c


def test_api_report_compare_and_checkpoint(client):
    sid = client.post("/api/simulations", json={"seed": 1}).json()["simulation"]["id"]
    assert client.get(f"/api/simulations/{sid}/report").status_code == 409
    assert client.get(f"/api/simulations/{sid}/compare").status_code == 422        # only one run
    for c in FAST:
        assert client.post(f"/api/simulations/{sid}/decisions", json={"choice_id": c}).status_code == 200
    rep = client.get(f"/api/simulations/{sid}/report")
    assert rep.status_code == 200 and rep.json()["overall"]["band"] and len(rep.json()["categories"]) == 8
    cp = client.get(f"/api/simulations/{sid}/checkpoints/9").json()
    assert cp["chosen_choice_id"] == "r10_verified" and len(cp["choices"]) == 3
    assert client.get(f"/api/simulations/{sid}/checkpoints/55").status_code == 422
    alt = client.post(f"/api/simulations/{sid}/replay", json={"checkpoint_index": 9, "choices": ["r10_sweep"]}).json()
    cmp_ = client.get(f"/api/simulations/{sid}/compare")
    assert cmp_.status_code == 200 and cmp_.json()["other"]["run_id"] == alt["run"]["id"]
    ids = [r["run_id"] for r in client.get(f"/api/simulations/{sid}/timeline").json()["runs"]]
    same = client.get(f"/api/simulations/{sid}/compare", params={"base": ids[0], "other": ids[0]})
    assert same.status_code == 422 and same.json()["error"]["code"] == "invalid_request"
    assert client.get("/api/simulations/nope/report").status_code == 404
    assert client.get(f"/api/simulations/{sid}/report", params={"run_id": alt["run"]["id"]}).json()["ending"]["id"] == "hospitals_served"
