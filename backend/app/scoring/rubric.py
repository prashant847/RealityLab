"""The scoring rubric: eight categories, explicit formulas, fixed weights. No language model is
involved anywhere in scoring. Every formula below is also written out in docs/SCORING.md
(generated from this file by tools/gen_scoring_doc.py).

All category scores are 0..100. Inputs are recorded state values, never opinions.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..engine.state import WorldState

VERSION = 1


@dataclass(frozen=True)
class Category:
    id: str
    name: str
    weight: float
    formula: str          # human-readable, shown in the report and docs
    measures: str


CATEGORIES: tuple[Category, ...] = (
    Category("safety", "Staff safety & risk management", 0.20,
             "staff_safety − 15 × [operations continued without a qualified safety check]",
             "Whether people were kept safe, and whether safety procedure was followed."),
    Category("inventory", "Cargo records & evidence reliability", 0.15,
             "0.45 × evidence_quality + 0.40 × verified_share + 0.15 × shipment_reliability, where verified_share = "
             "min(100, 100 × verified_units ÷ (hospital_need + contract_need)) and shipment_reliability = "
             "max(0, 100 − 5 × phantom_units_shipped)",
             "How trustworthy your cargo numbers and your evidence trail were."),
    Category("finance", "Financial discipline", 0.10,
             "50 + 50 × min(1, budget_left ÷ 3 points) − 25 × [invoice defaulted] − 25 × [penalty unpaid] − 15 × [most of the effort committed early]",
             "Keeping effort in reserve and meeting obligations."),
    Category("recovery", "Recovery speed", 0.10,
             "0.50 × system_integrity + 0.30 × recovery_progress + 0.20 × min(100, 100 × time_slack_left ÷ 120 min)",
             "How far systems were actually restored, and how much time was left."),
    Category("delivery", "Delivery prioritization", 0.25,
             "100 × (0.70 × min(1, hospital_units_shipped ÷ hospital_need) + 0.30 × min(1, contract_units_shipped ÷ contract_need)) "
             "− 10 × [urgent customers deprioritized]; 0 if the reopening deadline was missed",
             "How much of what was needed actually moved, urgent customers first."),
    Category("coordination", "Stakeholder coordination", 0.08,
             "average of the five stakeholders' trust in you",
             "Whether your team stayed with you through the decisions."),
    Category("communication", "Communication quality", 0.07,
             "public_trust + 8 × [factual statement or coordinated briefing] − 15 × [silence] − 10 × [leads disagreed publicly]",
             "How the story was handled once it leaked."),
    Category("adaptability", "Adaptability to new information", 0.05,
             "100 × (decisions rated sound ÷ decisions) counted from the first setback onward (all decisions if there was no setback)",
             "Whether decisions stayed sound after things went wrong."),
)
WEIGHTS = {c.id: c.weight for c in CATEGORIES}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9

ENDING_CAPS = {"safety_failure": 40, "missed_dispatch": 35, "critical_shortfall": 60}
BANDS = ((90, "Exemplary"), (75, "Strong"), (60, "Adequate"), (40, "Weak"), (0, "Poor"))


def band(score: float) -> str:
    return next(name for floor, name in BANDS if score >= floor)


def _c(v: float) -> float:
    return max(0.0, min(100.0, v))


def projected_dispatch(s: WorldState) -> dict[str, int]:
    """What could be dispatched right now from verified stock and capacity (used for mid-game snapshots)."""
    h = min(s.hospital_need, s.verified_units, s.transport_capacity)
    c = min(s.contract_need, max(0, min(s.verified_units, s.transport_capacity) - h))
    return {"shipped_hospital": h, "shipped_contract": c, "deadline_met": s.window_min >= 0, "provisional_shortfall": 0}


def category_scores(s: WorldState, dispatch: dict[str, Any] | None = None,
                    adaptability: float | None = None) -> dict[str, float]:
    """Raw 0..100 score per category. `dispatch=None` projects delivery from the current state;
    `adaptability=None` leaves that category out (callers renormalise)."""
    d = dispatch or projected_dispatch(s)
    flags = set(s.flags)
    safety = _c(s.staff_safety - 15 * ("unsafe_ops" in flags))
    verified_share = min(100.0, 100.0 * s.verified_units / (s.hospital_need + s.contract_need))
    reliability = max(0.0, 100.0 - 5 * d.get("provisional_shortfall", 0))
    inventory = _c(0.45 * s.evidence_quality + 0.40 * verified_share + 0.15 * reliability)
    finance = _c(50 + 50 * min(1.0, s.budget / 3.0) - 25 * ("invoice_default" in flags)
                 - 25 * ("penalty_unpaid" in flags) - 15 * ("spent_heavy_early" in flags))
    recovery = _c(0.5 * s.system_integrity + 0.3 * s.recovery_progress + 0.2 * min(100.0, 100.0 * max(0, s.window_min) / 120))
    if not d.get("deadline_met", True):
        delivery = 0.0
    else:
        delivery = _c(100 * (0.7 * min(1.0, d["shipped_hospital"] / s.hospital_need)
                             + 0.3 * min(1.0, d["shipped_contract"] / s.contract_need))
                      - 10 * ("hospitals_deprioritized" in flags))
    coordination = _c(sum(s.trust.values()) / len(s.trust))
    communication = _c(s.public_trust + 8 * ("factual_statement" in flags or "coordinated_briefing" in flags)
                       - 15 * ("silence" in flags) - 10 * ("leads_disagreed" in flags))
    out = {"safety": safety, "inventory": inventory, "finance": finance, "recovery": recovery,
           "delivery": delivery, "coordination": coordination, "communication": communication}
    if adaptability is not None:
        out["adaptability"] = _c(adaptability)
    return out


def weighted(scores: dict[str, float]) -> float:
    """Weighted mean over the categories present (weights renormalised if one is missing)."""
    total = sum(WEIGHTS[k] for k in scores)
    return sum(WEIGHTS[k] * v for k, v in scores.items()) / total


def overall(scores: dict[str, float], ending: str | None) -> tuple[float, str | None]:
    """Overall score and the cap that applied, if any."""
    raw = weighted(scores)
    cap = ENDING_CAPS.get(ending or "")
    return (min(raw, cap), f"{ending.replace('_', ' ')} caps the overall score at {cap}") if cap is not None and raw > cap else (raw, None)


def snapshot_score(s: WorldState) -> float:
    """Comparable 0..100 'readiness' of any state (no adaptability term); used to size a decision's impact."""
    return weighted(category_scores(s))
