import random

import pytest

from app.engine import apply_decision, new_simulation, planner
from app.engine.engine import availability, search_step
from app.scenario.rounds import ROUNDS

from .helpers import CAUTIOUS, play


def naive_best(s):
    """Reference implementation: plain exhaustive recursion, no memo, no early exit."""
    if s.status == "completed":
        return planner.TIER[s.ending]
    return max(naive_best(search_step(s, c)) for c in ROUNDS[s.round].choices if availability(s, c)[0])


@pytest.mark.parametrize("seed", [1, 2, 3])
def test_memoised_search_matches_naive_search_on_late_states(seed):
    rng = random.Random(seed)
    for _ in range(6):
        s = new_simulation(seed)
        for _ in range(rng.randint(5, 8)):                       # keep subtrees small for the naive search
            options = [c for c in ROUNDS[s.round].choices if availability(s, c)[0]]
            s, _o = apply_decision(s, rng.choice(options).id)
        planner.clear_cache()
        assert planner.best_tier(s) == naive_best(s)


def test_every_seed_starts_winnable():
    for seed in range(60):
        assert planner.classify(new_simulation(seed))["status"] == "viable"


def test_plan_returned_for_viable_states_actually_reaches_the_objective():
    s = new_simulation(4)
    plan = planner.classify(s)["plan"]
    for cid in plan:
        s, _ = apply_decision(s, cid)
    assert s.status == "completed" and planner.TIER[s.ending] >= planner.OBJECTIVE_TIER


def test_cautious_path_stays_viable_at_every_step():
    s = new_simulation(1)
    for cid in CAUTIOUS:
        assert planner.classify(s)["status"] == "viable"
        s, _ = apply_decision(s, cid)
    assert planner.classify(s)["status"] == "completed"


def test_node_limit_yields_unknown_never_a_false_dead_end():
    planner.clear_cache()
    s = play(["r1_isolate", "r2_maintain"])[0]                   # truly dead, but needs a real search to prove
    assert planner.classify(s, node_limit=3)["status"] == "unknown"
    assert planner.classify(s)["status"] == "dead_end"


def test_money_alone_can_never_soft_lock_the_game():
    """Every reachable state must offer at least one available choice (random play, many seeds)."""
    rng = random.Random(7)
    for trial in range(400):
        s = new_simulation(trial % 20)
        while s.status == "active":
            options = [c for c in ROUNDS[s.round].choices if availability(s, c)[0]]
            assert options, f"no available choice in round {s.round} after {[d['choice_id'] for d in s.decisions]}"
            s, _ = apply_decision(s, rng.choice(options).id)


def test_regression_exhausted_budget_still_leaves_a_round_6_option():
    s, _ = play(["r1_rush", "r2_maintain", "r3_divert_depot", "r4_provisional", "r5_restoration"], seed=2)
    assert s.budget < 0.3
    assert [c.id for c in ROUNDS[6].choices if availability(s, c)[0]]
