"""Judging decisions by the information available when they were made.

Hindsight is not fair: a sensible choice can meet bad luck, and a reckless one can get away with it.
So each decision is rated against a fixed set of *plausible worlds*: the player could not know the
future dice or the true stock level, so each option is tried in WORLDS alternate worlds that differ
in exactly those two unknowns. Value = best ending tier still reachable afterwards (the planner's
tiers: 3 = hospitals fully served, 2 = partial, 1 = shortfall, 0 = missed / safety failure).

  ev(option)        mean tier over the plausible worlds       (what the choice was worth ex ante)
  regret_ev         best ev − ev(chosen)                     (how much better a known alternative was)
  rating            sound ≤ SOUND_MAX_REGRET < questionable ≤ POOR_MIN_REGRET < poor
  hindsight_regret  best actual tier − actual tier of chosen (what really happened in this run's world)
  outcome           unlucky = sound but hindsight regret > 0;  lucky = not sound but no hindsight regret
"""
from __future__ import annotations

from typing import Any

from ..engine import planner
from ..engine.engine import availability, preview, search_step
from ..engine.rules import clone
from ..engine.state import WorldState
from ..scenario.rounds import ROUNDS
from ..stakeholders.agents import STAKEHOLDER_IDS
from ..stakeholders.policy import build_core
from .rubric import snapshot_score

SOUND_MAX_REGRET = 0.34
POOR_MIN_REGRET = 1.0
STOCK_SHIFTS = (0, -30, 30, -15, 15, 0)       # plausible errors in the (hidden) true stock, in units
WORLDS = len(STOCK_SHIFTS)


def worlds(cp: WorldState) -> list[WorldState]:
    """Alternate worlds from a checkpoint: same visible situation, different dice and true stock."""
    out = []
    for k, shift in enumerate(STOCK_SHIFTS):
        w = clone(cp)
        w.seed = cp.seed if k == 0 else (cp.seed * 7919 + k * 104729) % (2**31)
        w.true_units = max(0, cp.true_units + shift)
        w.verified_units = min(w.verified_units, w.true_units)
        out.append(w)
    return out


def classify(regret_ev: float) -> str:
    return "sound" if regret_ev <= SOUND_MAX_REGRET else "questionable" if regret_ev <= POOR_MIN_REGRET else "poor"


def outcome_label(rating: str, hindsight_regret: int) -> str:
    if rating == "sound" and hindsight_regret > 0:
        return "unlucky"
    if rating != "sound" and hindsight_regret == 0:
        return "lucky"
    return "as_expected"


def _verdict(rating: str, outcome: str, p_chosen: float, p_best: float, best_label: str) -> str:
    pc, pb = round(100 * p_chosen), round(100 * p_best)
    if rating == "sound" and outcome == "unlucky":
        return (f"A reasonable choice: it kept the objective reachable in {pc}% of plausible worlds. "
                "Chance, not judgement, made this one cost you.")
    if rating == "sound":
        return f"A sound choice: it kept the objective reachable in {pc}% of plausible worlds."
    if outcome == "lucky":
        return (f"This worked out, but it was risky: only {pc}% of plausible worlds kept the objective reachable, "
                f"against {pb}% for “{best_label}”.")
    word = "Questionable" if rating == "questionable" else "A poor choice given what you knew"
    return f"{word}: only {pc}% of plausible worlds kept the objective reachable, against {pb}% for “{best_label}”."


def rate_decision(cp: WorldState, chosen_id: str) -> dict[str, Any]:
    """Rate one decision from the checkpoint (state before it was made)."""
    ws = worlds(cp)
    options = []
    for c in ROUNDS[cp.round].choices:
        if not availability(cp, c)[0]:
            continue
        tiers = [planner.best_tier(search_step(w, c)) for w in ws]
        tiers = [t for t in tiers if t is not None] or [0]
        actual = planner.best_tier(search_step(cp, c))
        options.append({"choice_id": c.id, "label": c.label, "ev": sum(tiers) / len(tiers),
                        "readiness": round(snapshot_score(preview(cp, c)), 2),
                        "p_objective": sum(t >= planner.OBJECTIVE_TIER for t in tiers) / len(tiers),
                        "actual_tier": 0 if actual is None else actual, "choice": c})
    chosen = next(o for o in options if o["choice_id"] == chosen_id)
    best = max(options, key=lambda o: (round(o["ev"], 6), o["p_objective"], o["readiness"]))
    regret_ev = best["ev"] - chosen["ev"]
    hindsight = max(o["actual_tier"] for o in options) - chosen["actual_tier"]
    rating = classify(regret_ev)
    outcome = outcome_label(rating, hindsight)
    warned, advisor_recs = [], {}
    for sid in STAKEHOLDER_IDS:                     # visible warnings at the time (public facts only)
        core = build_core(sid, cp)
        advisor_recs[sid] = core["recommendation"]
        st = next((x for x in core["stances"] if x["choice_id"] == chosen_id), None)
        if st and st["verdict"] == "oppose" and st["reasons"]:
            warned.append({"stakeholder": sid, "why": st["reasons"][0]})
    return {
        "choice_id": chosen_id, "label": chosen["label"], "rating": rating, "outcome": outcome,
        "ev": round(chosen["ev"], 2), "best_ev": round(best["ev"], 2), "regret_ev": round(regret_ev, 2),
        "p_objective": round(chosen["p_objective"], 2), "p_best": round(best["p_objective"], 2),
        "hindsight_regret": hindsight, "best_choice_id": best["choice_id"], "best_label": best["label"],
        "warned_by": warned, "advisor_recs": advisor_recs,
        "verdict": _verdict(rating, outcome, chosen["p_objective"], best["p_objective"], best["label"]),
        "options": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in o.items() if k != "choice"} for o in options],
        "_best_choice": best["choice"], "_chosen_choice": chosen["choice"],
    }


def alternative_preview(cp: WorldState, chosen, alt) -> dict[str, list[float]]:
    """Immediate differences between taking `alt` and `chosen`, as {metric: [chosen, alt]}."""
    a, b = preview(cp, chosen), preview(cp, alt)
    keys = ("budget", "window_min", "evidence_quality", "system_integrity", "recovery_progress", "staff_safety",
            "labour_pct", "verified_units", "transport_capacity", "public_trust")
    return {k: [getattr(a, k), getattr(b, k)] for k in keys if getattr(a, k) != getattr(b, k)}
