"""The technical-work simulations: every step has exactly one option that works and two that fail for a stated technical reason."""
import pytest

from app.sims import engine as E
from app.sims.registry import ALL, LABS


@pytest.mark.parametrize("sc", LABS.values(), ids=lambda s: s.id)
def test_each_step_has_one_working_option_and_two_failures(sc):
    assert len(sc.rounds) == 7
    for r in sc.rounds:
        assert [c.id.rsplit("_", 1)[1] for c in r.choices] == ["strong", "mixed", "weak"], r.id
        good, *bad = r.choices
        assert not good.fails and good.rating == "strong" and good.effects.get("progress", 0) > 0
        assert all(c.fails and c.rating == "weak" and len(c.consequence) > 60 and c.lesson for c in bad), r.id


@pytest.mark.parametrize("sc", LABS.values(), ids=lambda s: s.id)
def test_the_correct_path_finishes_and_any_wrong_option_ends_the_job_at_that_step(sc):
    st = E.new_state(sc, (), "s")
    for r in sc.rounds:
        st, out = E.decide(sc, st, f"{r.id}_strong")
    assert st["status"] == "completed" and st["ending"] == "success" and st["meters"]["progress"] == 100
    for i, r in enumerate(sc.rounds):
        for kind in ("mixed", "weak"):
            st = E.new_state(sc, (), "s")
            for earlier in sc.rounds[:i]:
                st, _ = E.decide(sc, st, f"{earlier.id}_strong")
            st, out = E.decide(sc, st, f"{r.id}_{kind}")
            assert out["completed"] and st["ending"] == "failed" and len(st["decisions"]) == i + 1
            rep = E.build_report(sc, st, {})
            assert rep["outcome"]["tone"] == "bad" and rep["improve"][-1]["stronger_option"] == r.choices[0].label


def test_labs_are_not_careers():
    """They are run like any scenario, but kept out of the career list that is compared."""
    from app.sims.registry import SCENARIOS
    assert set(LABS) == {"circuit", "surgery"} and set(LABS) <= set(ALL) and not set(LABS) & set(SCENARIOS)
