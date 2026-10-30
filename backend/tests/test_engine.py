import pytest

from app.engine import InvalidDecision, SimulationFinished, apply_decision, new_simulation, player_state, scene_view
from app.engine.state import HIDDEN_FIELDS
from app.scenario.events import EVENTS
from app.scenario.rounds import ROUNDS

from .helpers import CAUTIOUS, RISKY, play


# 1. creating a new simulation
def test_new_simulation_initial_state():
    s = new_simulation(seed=7, simulation_id="abc")
    assert (s.simulation_id, s.seed, s.round, s.status) == ("abc", 7, 1, "active")
    assert s.budget == 12.0 and s.recorded_units == 480 and s.verified_units == 0
    assert s.decisions == [] and s.events == []
    view = scene_view(s)
    assert view["round"] == 1 and view["clock"] == "8:40 PM" and len(view["choices"]) == 3


def test_player_view_hides_ground_truth():
    s = new_simulation(1)
    assert all(f not in player_state(s) for f in HIDDEN_FIELDS)
    assert "true_units" in s.model_dump()


def test_every_round_defines_choices_and_unique_ids():
    ids = [c.id for r in ROUNDS.values() for c in r.choices]
    assert sorted(ROUNDS) == list(range(1, 11)) and len(ids) == len(set(ids))
    assert all(len(r.choices) >= 3 for r in ROUNDS.values())
    assert len({e.id for e in EVENTS}) == len(EVENTS)


# 2. each decision type applies its documented effects
def test_isolate_effects_exact():
    s0 = new_simulation(1)
    s, out = apply_decision(s0, "r1_isolate")
    assert s.containment == "full"
    assert s.evidence_quality == s0.evidence_quality + 25
    assert s.system_integrity == s0.system_integrity + 10
    assert s.labour_pct == s0.labour_pct - 10          # reduced operating capacity
    assert s.budget == 11.5 and s.window_min == s0.window_min - 40
    assert "Evidence quality +25" in out["effects"]
    assert s0.round == 1 and s0.budget == 12.0          # input untouched


def test_rush_restore_damages_evidence_and_sets_flag():
    s, _ = apply_decision(new_simulation(1), "r1_rush")
    assert s.decisions[0]["deltas"]["evidence_quality"] == [40, 20]   # events may later reduce it further
    assert "rushed_restore" in s.flags and s.containment == "none"


@pytest.mark.parametrize("rnd", range(1, 11))
def test_every_choice_applies_without_error(rnd):
    # Reach round `rnd` by the cautious path, then try every available choice from there.
    s, _ = play(CAUTIOUS[: rnd - 1])
    for c in scene_view(s)["choices"]:
        if c["available"]:
            s2, out = apply_decision(s, c["id"])
            assert s2.decisions[-1]["choice_id"] == c["id"]
            assert out["consequence"]


# 3. resource totals and time advancement
def test_time_and_budget_accounting():
    s, _ = play(["r1_isolate", "r2_evacuate", "r3_alt_transport"])
    assert s.budget == pytest.approx(12 - 0.5 - 0.3 - 4.0)
    spent_time = sum(d["time_cost"] for d in s.decisions)
    assert spent_time == 40 + 30 + 10
    assert s.round == 4
    assert [d["round"] for d in s.decisions] == [1, 2, 3]


def test_state_is_clamped():
    s, _ = play(CAUTIOUS)
    for f in ("public_trust", "staff_safety", "evidence_quality", "system_integrity"):
        assert 0 <= getattr(s, f) <= 100
    assert s.verified_units <= s.true_units and s.budget >= 0


# 4. safety-critical restrictions
def test_restricted_ops_blocked_without_safety_clearance():
    s, _ = play(["r1_isolate", "r2_maintain", "r3_alt_transport", "r4_pause", "r5_minimal",
                 "r6_restrict", "r7_hospital_first"])
    assert "site_cleared" not in s.flags
    choice = next(c for c in scene_view(s)["choices"] if c["id"] == "r8_restricted")
    assert not choice["available"] and "cleared" in choice["reason"]
    with pytest.raises(InvalidDecision):
        apply_decision(s, "r8_restricted")


def test_restricted_ops_allowed_after_authorized_assessment():
    s, _ = play(["r1_isolate", "r2_secure", "r3_alt_transport", "r4_pause", "r5_minimal",
                 "r6_restrict", "r7_hospital_first"])
    assert next(c for c in scene_view(s)["choices"] if c["id"] == "r8_restricted")["available"]


def test_unsafe_operations_are_punished_not_rewarded():
    safe, _ = apply_decision(play(["r1_isolate"])[0], "r2_evacuate")
    risky, _ = apply_decision(play(["r1_isolate"])[0], "r2_maintain")
    assert risky.staff_safety < safe.staff_safety
    assert risky.labour_pct > safe.labour_pct  # the temptation is real: more labour...
    assert risky.window_min > safe.window_min  # ...and more time


# 5. conditional event triggering
def fired(s):
    return {e["event_id"] for e in s.events}


def test_flare_up_requires_unsafe_ops():
    for seed in range(40):
        s, _ = play(["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause"], seed=seed)
        assert "flare_up" not in fired(s)


def test_flare_up_fires_after_unsafe_ops():
    hits = sum("flare_up" in fired(play(["r1_isolate", "r2_maintain", "r3_alt_transport", "r4_pause", "r5_minimal"], seed=sd)[0])
               for sd in range(40))
    assert hits >= 28  # p=0.85 per round in window; delayed rounds allowed


def test_interruption_only_without_full_containment():
    for seed in range(30):
        full = play(["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause"], seed=seed)[0]
        assert "secondary_interruption" not in fired(full)
    rushed = sum("secondary_interruption" in fired(play(["r1_rush", "r2_evacuate", "r3_alt_transport", "r4_pause"], seed=sd)[0])
                 for sd in range(30))
    assert rushed >= 20


def test_scout_report_depends_on_unverified_depot():
    div = play(["r1_isolate", "r2_evacuate", "r3_divert_depot"])[0]
    assert div.decisions[-1]["deltas"]["transport_capacity"] == [400, 240]
    assert "depot_scout_report" in fired(div)          # fires on entering round 4
    assert div.transport_capacity == 200
    alt = play(["r1_isolate", "r2_evacuate", "r3_alt_transport"])[0]
    assert "depot_scout_report" not in fired(alt) and alt.transport_capacity == 300


def test_early_evidence_improves_verification():
    careful = play(["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause"])[0]
    sloppy = play(["r1_rush", "r2_evacuate", "r3_alt_transport", "r4_pause"])[0]
    assert careful.verified_units > sloppy.verified_units


def test_overspending_blocks_later_contingency():
    s, _ = play(["r1_controlled", "r2_secure", "r3_divert_depot", "r4_provisional", "r5_restoration"])
    assert s.budget < 2.0
    spec = next(c for c in scene_view(s)["choices"] if c["id"] == "r6_specialist")
    assert not spec["available"] and "lakh" in spec["reason"]


def test_staged_spending_keeps_contingency_open():
    s, _ = play(["r1_controlled", "r2_secure", "r3_divert_depot", "r4_pause", "r5_minimal"])
    assert next(c for c in scene_view(s)["choices"] if c["id"] == "r6_specialist")["available"]


def test_verified_route_adds_capacity_in_time():
    s, _ = play(["r1_isolate", "r2_evacuate", "r3_divert_depot", "r4_pause", "r5_logistics", "r6_restrict"])
    assert "depot_verified" in s.flags and "verified_route_pays_off" in fired(s)


# 6. multiple endings
def test_cautious_and_risky_reach_different_endings():
    good, _ = play(CAUTIOUS)
    bad, _ = play(RISKY)
    assert good.status == bad.status == "completed"
    assert good.ending != bad.ending
    assert good.final["shipped_total"] > bad.final["shipped_total"]


def test_safety_failure_ending_reachable():
    ends = {play(["r1_isolate", "r2_maintain", "r3_alt_transport", "r4_pause", "r5_logistics", "r6_restrict",
                  "r7_hospital_first", "r8_suspend", "r9_holding", "r10_sweep"], seed=sd)[0].ending for sd in range(20)}
    assert "safety_failure" in ends


def test_ending_depends_on_history_not_just_last_decision():
    tail = ["r2_evacuate", "r3_alt_transport", "r4_pause", "r5_minimal", "r6_restrict",
            "r7_hospital_first", "r8_suspend", "r9_holding", "r10_sweep"]
    a = play(["r1_isolate", *tail])[0]
    b = play(["r1_rush", *tail])[0]
    assert a.decisions[-1]["choice_id"] == b.decisions[-1]["choice_id"]
    assert (a.final["shipped_total"], a.budget, a.evidence_quality) != (b.final["shipped_total"], b.budget, b.evidence_quality)


def test_provisional_overstatement_hurts_trust_at_dispatch():
    s, _ = play(["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_provisional", "r5_minimal", "r6_restrict",
                 "r7_hospital_first", "r8_suspend", "r9_holding", "r10_provisional"])
    assert s.final["provisional_shortfall"] > 0 and "mis_shipment" in s.flags


# 12. reproducibility
def test_same_seed_same_decisions_identical_state():
    a, _ = play(RISKY, seed=42)
    b, _ = play(RISKY, seed=42)
    assert a.model_dump() == b.model_dump()


def test_different_seeds_can_diverge():
    outcomes = {tuple(sorted(fired(play(["r1_rush", "r2_secure", "r3_alt_transport", "r4_pause"], seed=sd)[0]))) for sd in range(30)}
    assert len(outcomes) > 1


# 15. invalid actions
def test_unknown_choice_rejected():
    with pytest.raises(InvalidDecision):
        apply_decision(new_simulation(1), "nonsense")


def test_choice_from_wrong_round_rejected():
    with pytest.raises(InvalidDecision):
        apply_decision(new_simulation(1), "r2_evacuate")


def test_cannot_decide_after_completion():
    s, _ = play(CAUTIOUS)
    with pytest.raises(SimulationFinished):
        apply_decision(s, "r10_sweep")


def test_unaffordable_choice_rejected():
    s, _ = play(["r1_controlled", "r2_secure", "r3_divert_depot", "r4_provisional", "r5_restoration"])
    with pytest.raises(InvalidDecision):
        apply_decision(s, "r6_specialist")


def test_strong_evidence_triggers_insurer_advance():
    s, _ = play(["r1_isolate", "r2_evacuate", "r3_divert_depot", "r4_pause", "r5_minimal", "r6_specialist"])
    assert s.evidence_quality >= 75 and "insurer_advance" in fired(s)
    weak, _ = play(["r1_rush", "r2_evacuate", "r3_divert_depot", "r4_pause", "r5_minimal", "r6_parallel"])
    assert "insurer_advance" not in fired(weak)


def _keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _keys(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _keys(v)


def test_player_facing_payloads_never_contain_the_hidden_stock_even_inside_recorded_changes():
    from app.engine import apply_decision, player_state, scene_view
    seed = next(s for s in range(1, 60) if any(e["event_id"] == "dock_flooding" for e in play(CAUTIOUS, seed=s)[0].events))
    s, _ = play(CAUTIOUS[:2], seed=seed)
    outs = []
    for cid in CAUTIOUS[2:]:
        s, out = apply_decision(s, cid)
        outs.append(out)
        payloads = [player_state(s), scene_view(s), out]
        assert all("true_units" not in set(_keys(p)) for p in payloads)
    assert any(e["event_id"] == "dock_flooding" for e in s.events)
    assert any("true_units" in e["deltas"] for e in s.events if e["event_id"] == "dock_flooding")   # internal truth is kept
