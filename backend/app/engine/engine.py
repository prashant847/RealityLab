"""Deterministic BLACKOUT simulation engine. Pure functions over WorldState: no I/O, no LLM."""
from __future__ import annotations

import math
import uuid
from typing import Any

from ..scenario.events import EVENTS
from ..scenario.pages import page_for
from ..scenario.rounds import ROUNDS, Choice, Round
from .rules import apply_effects, clone, read, roll
from .state import HIDDEN_FIELDS, LAST_ROUND, STAKEHOLDERS, WorldState

SCALARS = (
    "window_min", "budget", "system_integrity", "recovery_progress", "evidence_quality", "containment",
    "true_units", "verified_units", "provisional_units", "staff_safety", "labour_pct", "facility",
    "transport_capacity", "priority", "public_trust", "supplier_confidence",
    *[f"trust.{k}" for k in STAKEHOLDERS],
)
LABELS = {
    "window_min": "Time slack", "budget": "Budget", "system_integrity": "System integrity",
    "recovery_progress": "Recovery progress", "evidence_quality": "Evidence quality",
    "containment": "Containment", "verified_units": "Verified stock", "provisional_units": "Provisional stock",
    "staff_safety": "Staff safety", "labour_pct": "Available labour", "facility": "Facility",
    "transport_capacity": "Transport capacity", "priority": "Delivery priority", "public_trust": "Public trust",
    "supplier_confidence": "Supplier confidence",
    "trust.kavya": "Kavya's trust", "trust.arjun": "Arjun's trust", "trust.nisha": "Nisha's trust",
    "trust.raghav": "Raghav's trust", "trust.isha": "Dr. Kapoor's trust",
}
UNITS = {"window_min": " min", "budget": " lakh", "verified_units": " units", "provisional_units": " units",
         "transport_capacity": " units"}


class EngineError(Exception):
    """Base class; `code` maps to an HTTP status in the API layer."""
    code = "engine_error"


class InvalidDecision(EngineError):
    code = "invalid_decision"


class SimulationFinished(EngineError):
    code = "simulation_finished"


def new_simulation(seed: int | None = None, simulation_id: str | None = None) -> WorldState:
    if seed is None:
        seed = uuid.uuid4().int % (2**31)
    return WorldState(simulation_id=simulation_id or uuid.uuid4().hex[:12], seed=seed)


# ----------------------------------------------------------------------------- scene view

def _ctx(state: WorldState) -> dict[str, Any]:
    d = state.model_dump(exclude=set(HIDDEN_FIELDS))
    d["budget"] = f"{state.budget:.1f}"
    return d


def availability(state: WorldState, choice: Choice) -> tuple[bool, str]:
    if state.budget + 1e-9 < choice.cost:
        return False, f"Needs ₹{choice.cost:.1f} lakh; only ₹{state.budget:.1f} lakh remains."
    for cond, reason in choice.requires:
        if not cond.test(state):
            return False, reason
    return True, ""


def scene_info(state: WorldState, rnd: Round | None = None) -> list[str]:
    rnd = rnd or ROUNDS[state.round]
    ctx = _ctx(state)
    return [text.format(**ctx) for conds, text in rnd.info if all(c.test(state) for c in conds)]


def scene_view(state: WorldState) -> dict[str, Any]:
    """Everything the player is allowed to know about the current moment."""
    if state.status == "completed":
        return {"round": LAST_ROUND, "completed": True, "events": public_events(state.round_events), "final": state.final,
                "ending": state.ending}
    rnd = ROUNDS[state.round]
    choices = []
    for c in rnd.choices:
        ok, why = availability(state, c)
        choices.append({"id": c.id, "label": c.label, "summary": c.summary, "cost": c.cost,
                        "time_cost": c.time_cost, "confirm": c.confirm, "available": ok, "reason": why})
    return {
        "round": rnd.number, "clock": rnd.clock, "title": rnd.title, "brief": rnd.brief,
        "environment": rnd.environment, "characters": [{"id": i, "expression": e} for i, e in rnd.characters],
        "effects": list(rnd.effects_overlay), "info": scene_info(state, rnd), "events": public_events(state.round_events),
        "choices": choices, "completed": False, "page": page_for(rnd.number),
    }


def public_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Event/decision records without the hidden ground truth. Stored records keep the full change
    (the post-game report uses it); anything shown to the player passes through here."""
    return [{**e, "deltas": {k: v for k, v in e["deltas"].items() if k not in HIDDEN_FIELDS}} if "deltas" in e else e
            for e in events]


def player_state(state: WorldState) -> dict[str, Any]:
    """State as shown to the player: hidden ground truth removed, including from recorded changes."""
    d = state.model_dump(exclude=set(HIDDEN_FIELDS))
    for key in ("events", "round_events", "decisions"):
        d[key] = public_events(d[key])
    return d


# ----------------------------------------------------------------------------- stepping

def _snapshot(s: WorldState) -> dict[str, Any]:
    return {k: read(s, k) for k in SCALARS}


def _diff(before: dict, after: dict) -> dict[str, list]:
    return {k: [before[k], after[k]] for k in before if before[k] != after[k]}


def describe_deltas(deltas: dict[str, list]) -> list[str]:
    out = []
    for k, (a, b) in deltas.items():
        if k in HIDDEN_FIELDS:
            continue
        label, unit = LABELS.get(k, k), UNITS.get(k, "")
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            d = round(b - a, 2)
            out.append(f"{label} {'+' if d > 0 else '−'}{abs(d):g}{unit}")
        else:
            out.append(f"{label}: {a} → {b}")
    return out


def find_choice(state: WorldState, choice_id: str) -> Choice:
    if state.status != "active":
        raise SimulationFinished("The simulation has already finished.")
    for c in ROUNDS[state.round].choices:
        if c.id == choice_id:
            return c
    raise InvalidDecision(f"'{choice_id}' is not an option in round {state.round}.")


def apply_decision(state: WorldState, choice_id: str) -> tuple[WorldState, dict[str, Any]]:
    """Return (new_state, outcome). The input state is never modified."""
    choice = find_choice(state, choice_id)
    ok, why = availability(state, choice)
    if not ok:
        raise InvalidDecision(why)
    return _advance(state, choice, record=True)


def preview(state: WorldState, choice: Choice) -> WorldState:
    """Dry run of a choice's direct effects (cost, time, effect list) without advancing the round
    or firing events. Used by stakeholders to reason about options; never stored."""
    s = clone(state)
    s.budget = round(s.budget - choice.cost, 2)
    s.window_min -= choice.time_cost
    apply_effects(s, choice.effects)
    return s


def search_step(state: WorldState, choice: Choice) -> WorldState:
    """Same transition as apply_decision but without narrative records; used by the planner.
    The caller must pass an available choice."""
    return _advance(state, choice, record=False)[0]


def _advance(state: WorldState, choice: Choice, record: bool) -> tuple[WorldState, dict[str, Any]]:
    rnd = ROUNDS[state.round]
    s = clone(state)
    if record:
        known = scene_info(state, rnd)
        before = _snapshot(s)
        flags_before = set(s.flags)

    s.budget = round(s.budget - choice.cost, 2)
    s.window_min -= choice.time_cost
    apply_effects(s, choice.effects)

    deltas: dict[str, list] = {}
    if record:
        deltas = _diff(before, _snapshot(s))
        decision = {
            "round": rnd.number, "clock": rnd.clock, "choice_id": choice.id, "label": choice.label,
            "known_info": known, "deltas": deltas,
            "flags_added": sorted(set(s.flags) - flags_before), "flags_removed": sorted(flags_before - set(s.flags)),
            "cost": choice.cost, "time_cost": choice.time_cost,
        }
        s.decisions = [*s.decisions, decision]
    s.round_events = []

    if rnd.number == LAST_ROUND:
        _finalize(s)
    else:
        s.round += 1
        _fire_events(s, record)

    if not record:
        return s, {}
    return s, {
        "choice_id": choice.id, "label": choice.label, "consequence": choice.consequence,
        "effects": describe_deltas(deltas), "events": public_events(s.round_events),
        "completed": s.status == "completed",
    }


# ----------------------------------------------------------------------------- events

def _fire_events(s: WorldState, record: bool = True) -> None:
    fired = {e["event_id"] for e in s.events}
    due = sorted((e for e in EVENTS if e.first_round <= s.round <= e.last_round and e.id not in fired),
                 key=lambda e: (-e.priority, e.id))
    for ev in due:
        if not all(c.test(s) for c in ev.conditions):
            continue
        if ev.probability < 1.0 and roll(s.seed, f"{ev.id}:{s.round}") >= ev.probability:
            continue
        if not record:
            apply_effects(s, ev.effects)
            s.events = [*s.events, {"event_id": ev.id}]
            continue
        before = _snapshot(s)
        apply_effects(s, ev.effects)
        entry = {
            "event_id": ev.id, "round": s.round, "clock": ROUNDS[s.round].clock, "title": ev.title,
            "text": ev.narrative, "assets": list(ev.assets),
            "recovery_note": ev.recovery_note, "deltas": _diff(before, _snapshot(s)),
        }
        entry["effects"] = describe_deltas(entry["deltas"])
        s.events = [*s.events, entry]
        s.round_events = [*s.round_events, entry]


# ----------------------------------------------------------------------------- ending

ENDINGS = {
    "full_recovery": ("FULL RECOVERY", "Both hospitals and the contract customer were served, safely and on time."),
    "hospitals_served": ("HOSPITALS SERVED", "The hospitals got what they needed, though other commitments went unmet."),
    "partial_dispatch": ("PARTIAL DISPATCH", "A meaningful share of urgent equipment left, but hospital need was not fully met."),
    "critical_shortfall": ("CRITICAL SHORTFALL", "Too little equipment left the gate; hospitals remain at risk."),
    "missed_dispatch": ("DISPATCH MISSED", "The 6:00 AM window closed before the trucks could leave."),
    "safety_failure": ("SAFETY FAILURE", "Workers were seriously hurt. Whatever shipped, it did not justify that."),
}


def compute_dispatch(s: WorldState) -> dict[str, Any]:
    """What can actually be shipped at 6:00 AM, from verified facts and capacity."""
    ratio = s.true_units / s.recorded_units
    prov_true = math.floor(s.provisional_units * ratio)
    shortfall = s.provisional_units - prov_true
    sellable = s.verified_units
    if "final_sweep" in s.flags or "final_provisional" in s.flags:
        sellable += prov_true
    on_time = s.window_min >= 0
    total = min(sellable, s.transport_capacity) if on_time else 0
    nh, nc = s.hospital_need, s.contract_need
    if s.priority == "hospital_first":
        h = min(nh, total); c = min(nc, total - h)
    elif s.priority == "contract_first":
        c = min(nc, total); h = min(nh, total - c)
    else:  # split: hospitals get up to 65% of the load, then leftovers go wherever still needed
        h = min(nh, math.ceil(total * 0.65)); c = min(nc, total - h)
        h = min(nh, h + (total - h - c))
    return {
        "shipped_hospital": h, "shipped_contract": c, "shipped_total": h + c, "sellable_units": sellable,
        "hospital_need": nh, "contract_need": nc, "transport_capacity": s.transport_capacity,
        "window_min": s.window_min, "deadline_met": on_time,
        "provisional_shortfall": shortfall if "final_provisional" in s.flags else 0,
    }


def _finalize(s: WorldState) -> None:
    final = compute_dispatch(s)
    if final["provisional_shortfall"]:
        s.public_trust = max(0, s.public_trust - math.ceil(final["provisional_shortfall"] / 5))
        s.add_flag("mis_shipment")
    h, c = final["shipped_hospital"], final["shipped_contract"]
    if s.staff_safety < 50:
        ending = "safety_failure"
    elif final["shipped_total"] == 0:
        ending = "missed_dispatch"
    elif h >= s.hospital_need and c >= s.contract_need and s.public_trust >= 60 and s.staff_safety >= 80:
        ending = "full_recovery"
    elif h >= s.hospital_need:
        ending = "hospitals_served"
    elif h >= 0.6 * s.hospital_need:
        ending = "partial_dispatch"
    else:
        ending = "critical_shortfall"
    title, text = ENDINGS[ending]
    s.final = {**final, "ending": ending, "ending_title": title, "ending_text": text,
               "public_trust": s.public_trust, "staff_safety": s.staff_safety, "budget": s.budget}
    s.ending = ending
    s.status = "completed"
