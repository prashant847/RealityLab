"""Feasibility search over the real simulation rules.

OBJECTIVE: ship the hospitals' full combined need safely (ending tier 3).
  tier 3  full_recovery, hospitals_served    objective achieved
  tier 2  partial_dispatch                   degraded: hospitals partly served
  tier 1  critical_shortfall
  tier 0  missed_dispatch, safety_failure

A state is a DEAD END when no sequence of available choices from it can reach tier 3. If a tier-2
ending is still reachable the dead end is *soft* (the player may knowingly continue); otherwise it
is *hard*. Poor metrics alone never cause a dead end: only the search result does.

METHOD: exhaustive depth-first search over `search_step` (the same transition function the live
game uses), memoised on a fingerprint of everything that can affect the future. The search is
exact within its node budget. If the budget is exceeded the result is "unknown" and callers must
treat it as NOT a dead end (we never declare a dead end without proof).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..scenario.rounds import ROUNDS
from .engine import SCALARS, availability, search_step
from .state import WorldState

TIER = {"full_recovery": 3, "hospitals_served": 3, "partial_dispatch": 2,
        "critical_shortfall": 1, "missed_dispatch": 0, "safety_failure": 0}
OBJECTIVE_TIER = 3
DEFAULT_NODE_LIMIT = 400_000
_MEMO: dict[tuple, tuple[int, str | None]] = {}
_MEMO_CAP = 2_000_000


class SearchLimit(Exception):
    pass


@dataclass
class _Ctx:
    nodes: int = 0
    limit: int = DEFAULT_NODE_LIMIT


def fingerprint(s: WorldState) -> tuple:
    return (s.seed, s.round, tuple(s.flags), tuple(sorted(e["event_id"] for e in s.events)),
            *[_scalar(s, k) for k in SCALARS], s.hospital_need, s.contract_need)


def _scalar(s: WorldState, k: str):
    return s.trust[k[6:]] if k.startswith("trust.") else getattr(s, k)


def _best(s: WorldState, ctx: _Ctx) -> int:
    if s.status == "completed":
        return TIER[s.ending]
    fp = fingerprint(s)
    hit = _MEMO.get(fp)
    if hit is not None:
        return hit[0]
    ctx.nodes += 1
    if ctx.nodes > ctx.limit:
        raise SearchLimit
    best, best_id = 0, None
    for c in ROUNDS[s.round].choices:
        if not availability(s, c)[0]:
            continue
        t = _best(search_step(s, c), ctx)
        if best_id is None or t > best:
            best, best_id = t, c.id
        if best == OBJECTIVE_TIER:
            break
    if len(_MEMO) > _MEMO_CAP:
        _MEMO.clear()
    _MEMO[fp] = (best, best_id)
    return best


def best_tier(s: WorldState, node_limit: int = DEFAULT_NODE_LIMIT) -> int | None:
    """Best ending tier reachable from `s`, or None if the node budget was exceeded."""
    try:
        return _best(s, _Ctx(limit=node_limit))
    except SearchLimit:
        return None


def choice_tiers(s: WorldState, node_limit: int = DEFAULT_NODE_LIMIT) -> dict[str, int | None]:
    """For each currently available choice, the best tier reachable after taking it."""
    out: dict[str, int | None] = {}
    for c in ROUNDS[s.round].choices:
        if availability(s, c)[0]:
            out[c.id] = best_tier(search_step(s, c), node_limit)
    return out


def best_plan(s: WorldState) -> list[str]:
    """A concrete sequence of choices achieving the best reachable tier (follows memo)."""
    plan: list[str] = []
    while s.status == "active":
        if best_tier(s) is None:
            break
        hit = _MEMO.get(fingerprint(s))
        if not hit or hit[1] is None:
            break
        plan.append(hit[1])
        s = search_step(s, next(c for c in ROUNDS[s.round].choices if c.id == hit[1]))
    return plan


def classify(s: WorldState, node_limit: int = DEFAULT_NODE_LIMIT) -> dict[str, Any]:
    """status: viable | dead_end | completed | unknown."""
    if s.status == "completed":
        return {"status": "completed", "best_tier": TIER[s.ending], "continue_allowed": False, "plan": []}
    t = best_tier(s, node_limit)
    if t is None:
        return {"status": "unknown", "best_tier": None, "continue_allowed": True, "plan": []}
    if t >= OBJECTIVE_TIER:
        return {"status": "viable", "best_tier": t, "continue_allowed": True, "plan": best_plan(s)}
    return {"status": "dead_end", "best_tier": t, "continue_allowed": t >= 2,
            "severity": "soft" if t >= 2 else "hard", "plan": best_plan(s) if t >= 2 else []}


def clear_cache() -> None:
    _MEMO.clear()

