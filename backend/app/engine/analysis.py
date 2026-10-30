"""Dead-end analysis. Built only from recorded decisions, recorded events and planner results;
nothing here is generated text about the player's skill. It states what happened and why.

Fairness: every decision is judged against the options and information that existed at its own
checkpoint (`known_info`). Later chance events are reported separately as `chance_events_after`.
"""
from __future__ import annotations

from typing import Any

from ..scenario.events import EVENTS
from ..scenario.risks import active_risks
from ..scenario.rounds import ROUNDS
from . import planner
from .engine import apply_decision, describe_deltas
from .state import LAST_ROUND, WorldState

TITLE = "DEAD END — RECOVERY WINDOW CLOSED"
_EVENTS = {e.id: e for e in EVENTS}


def _max_gain(field: str, state: WorldState) -> float:
    """Upper bound on how much `field` can still rise: best positive `add` per remaining round,
    ignoring budget and conditions. Deliberately generous so a diagnosis never overstates."""
    total = 0.0
    for n in range(state.round, LAST_ROUND + 1):
        gains = [fx.add.get(field, 0) for c in ROUNDS[n].choices for fx in c.effects]
        total += max([0, *gains])
    return total


def _min_forced_time(state: WorldState) -> int:
    return sum(min(c.time_cost for c in ROUNDS[n].choices) for n in range(state.round, LAST_ROUND + 1))


def diagnose(state: WorldState, nodes: int | None = None) -> list[dict[str, Any]]:
    """Concrete, checkable reasons the objective is out of reach from `state`."""
    out: list[dict[str, Any]] = []
    if state.status == "completed":
        return out
    if state.staff_safety + _max_gain("staff_safety", state) < 50:
        out.append({"id": "safety", "text": (
            f"Staff safety is {state.staff_safety}%. Below 50% the operation ends in a safety failure, and "
            "no remaining option restores it.")})
    spare = state.window_min - _min_forced_time(state)
    if spare < 0:
        out.append({"id": "time", "text": (
            f"Only {state.window_min} minutes remain before the reopening deadline, but even the fastest remaining "
            f"choices need {_min_forced_time(state)} minutes.")})
    need = state.hospital_need
    cap_ub = state.transport_capacity + _max_gain("transport_capacity", state)
    if cap_ub < need:
        out.append({"id": "transport", "text": (
            f"Transport capacity is {state.transport_capacity} cargo lots. Taking every remaining capacity option "
            f"would reach at most {int(cap_ub)} lots, short of the {need} lots time-critical customers need.")})
    else:
        costs = [c.cost for n in range(state.round, LAST_ROUND + 1) for c in ROUNDS[n].choices
                 if any(fx.add.get("transport_capacity", 0) > 0 for fx in c.effects)]
        if state.transport_capacity < need and costs and state.budget < min(costs):
            out.append({"id": "transport_budget", "text": (
                f"Transport capacity ({state.transport_capacity} lots) is below what time-critical customers need ({need}), "
                f"and the cheapest remaining way to add capacity costs {min(costs):g} points against "
                f"{state.budget:.1f} points left.")})
    stock_ub = min(state.true_units, state.verified_units + _max_gain("verified_units", state))
    if stock_ub < need:
        out.append({"id": "stock", "text": (
            f"Verified cargo is {state.verified_units} lots; verification options remaining could raise it to "
            f"about {int(stock_ub)} lots, short of {need}.")})
    return out


def _describe_event(e: dict[str, Any]) -> str:
    odds = "certain" if e["probability"] >= 1 else f"chance {e['probability']:.0%}"
    return f"{e['title']} (round {e['round']}, {odds}): {', '.join(e['effects'])}"


def project(state: WorldState) -> dict[str, Any] | None:
    """Play the best remaining sequence forward and report what still goes wrong on that path."""
    plan = planner.best_plan(state)
    if not plan or state.status != "active":
        return None
    s, events = state, []
    for cid in plan:
        s, out = apply_decision(s, cid)
        events += [{"title": e["title"], "round": e["round"], "effects": e["effects"],
                    "probability": _EVENTS[e["event_id"]].probability} for e in out["events"]]
    costly = [e for e in events if any("−" in x for x in e["effects"])]   # only events that cost something
    return {"plan": plan, "ending": s.ending, "ending_title": s.final["ending_title"] if s.final else None,
            "events": costly}


def _linked_events(state: WorldState, decision: dict, index: int) -> list[dict]:
    """Events that fired after decision `index` whose conditions trace to what it changed."""
    changed = set(decision["flags_added"]) | {k for k in decision["deltas"]}
    rnd = decision["round"]
    linked = []
    for ev in state.events:
        if ev["round"] <= rnd:
            continue
        spec = _EVENTS.get(ev["event_id"])
        if spec and any((c.op == "has" and c.value in changed) or (c.key in changed) for c in spec.conditions):
            linked.append(ev)
    return linked


def analyze_dead_end(checkpoints: list[WorldState], end_state: WorldState) -> dict[str, Any]:
    """`checkpoints[i]` is the state *before* decision i; `end_state` is the state after the last one."""
    decisions = end_state.decisions
    n = len(decisions)
    verdict = planner.classify(end_state)

    # Per-checkpoint: what each available option would have led to.
    steps = []
    for i, cp in enumerate(checkpoints[:n]):
        tiers = planner.choice_tiers(cp)
        best = max((t for t in tiers.values() if t is not None), default=0)
        steps.append({"i": i, "tiers": tiers, "chosen": decisions[i]["choice_id"], "best": best})
    after_tiers = planner.choice_tiers(end_state) if end_state.status == "active" else {}

    def viable_share(tiers: dict) -> tuple[int, int]:
        return sum(1 for t in tiers.values() if (t or 0) >= planner.OBJECTIVE_TIER), len(tiers)

    # Last recoverable checkpoint = latest one from which the objective was still reachable.
    last_ok = next((i for i in range(n - 1, -1, -1) if steps[i]["best"] >= planner.OBJECTIVE_TIER), None)

    contributing = []
    for st in steps:
        i, d = st["i"], decisions[st["i"]]
        t_chosen = st["tiers"].get(st["chosen"])
        nxt = steps[i + 1]["tiers"] if i + 1 < n else after_tiers
        vb, tb = viable_share(st["tiers"])
        va, ta = viable_share(nxt)
        fatal = st["best"] >= planner.OBJECTIVE_TIER and (t_chosen or 0) < planner.OBJECTIVE_TIER
        # "Narrowed": the share of next-step options that still keep recovery possible fell sharply.
        narrowed = (not fatal and tb and ta and va / ta <= vb / tb - 0.34)
        if not (fatal or narrowed):
            continue
        alts = [_label(decisions[i]["round"], cid) for cid, t in st["tiers"].items()
                if cid != st["chosen"] and (t or 0) >= planner.OBJECTIVE_TIER]
        risks_before = active_risks(checkpoints[i])
        risks_after = active_risks(checkpoints[i + 1] if i + 1 < len(checkpoints) else end_state)
        before_ids = {r["id"] for r in risks_before}
        chance = [{"title": e["title"], "probability": _EVENTS[e["event_id"]].probability, "text": e["text"]}
                  for e in end_state.events if e["round"] > d["round"] and e["event_id"] in _EVENTS
                  and _EVENTS[e["event_id"]].probability < 1.0]
        contributing.append({
            "index": i, "round": d["round"], "clock": d["clock"], "choice_id": d["choice_id"], "label": d["label"],
            "kind": "closed_recovery_window" if fatal else "narrowed_options",
            "effects": describe_deltas(d["deltas"]),
            "known_at_time": d["known_info"],
            "viable_alternatives": alts,
            "options_keeping_recovery_before": {"viable": vb, "total": tb},
            "options_keeping_recovery_after": {"viable": va, "total": ta},
            "risks_visible_then": [r["text"] for r in risks_before],
            "risks_created": [r["text"] for r in risks_after if r["id"] not in before_ids],
            "consequences": [{"title": e["title"], "round": e["round"], "text": e["text"], "effects": e.get("effects", [])}
                             for e in _linked_events(end_state, d, i)],
            "chance_events_after": chance,
        })

    closing = next((c for c in contributing if c["kind"] == "closed_recovery_window"), None)
    diag = diagnose(end_state)
    proj = project(end_state)
    if proj:
        evs = "; ".join(_describe_event(e) for e in proj["events"])
        diag.append({"id": "projection", "text": (
            f"Playing the best remaining sequence still ends in {proj['ending_title']}."
            + (f" Events on that path: {evs}." if evs else ""))})
    if not diag:
        diag.append({"id": "combination", "text": (
            "No single limit is exhausted, but an exhaustive search of every remaining combination of "
            "affordable choices finds none that reaches the objective.")})
    what = [f"Round {c['round']} ({c['clock']}): you chose \"{c['label']}\". Effects: {'; '.join(c['effects']) or 'none recorded'}."
            for c in contributing]
    ignored = sorted({t for c in contributing for t in c["risks_visible_then"]})
    return {
        "title": TITLE,
        "severity": verdict.get("severity"),
        "continue_allowed": bool(verdict.get("continue_allowed")),
        "what_happened": what,
        "why_unrecoverable": diag,
        "contributing_decisions": contributing,
        "risks_not_addressed": ignored,
        "risks_created_by_decisions": sorted({t for c in contributing for t in c["risks_created"]}),
        "projection": proj,
        "last_recoverable_checkpoint": last_ok,
        "critical_point": None if closing is None else {
            "checkpoint_index": closing["index"], "round": closing["round"], "clock": closing["clock"],
            "decision_taken": closing["label"], "better_options": closing["viable_alternatives"],
            "known_at_time": closing["known_at_time"],
        },
        "timeline": [{"index": s["i"], "round": decisions[s["i"]]["round"], "label": decisions[s["i"]]["label"],
                      "tier_reached": s["tiers"].get(s["chosen"]), "best_tier_available": s["best"]}
                     for s in steps],
        "best_reachable_tier": verdict.get("best_tier"),
        "recovery_plan_from_checkpoint": planner.best_plan(checkpoints[last_ok]) if last_ok is not None else [],
    }


def _label(round_no: int, choice_id: str) -> str:
    return next(c.label for c in ROUNDS[round_no].choices if c.id == choice_id)
