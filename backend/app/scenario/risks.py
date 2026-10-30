"""Active risks derived from visible state. Shown to the player and stored in checkpoints."""
from __future__ import annotations

from ..engine.rules import Cond, gt, has, lacks, lt, ne

RISKS: tuple[tuple[str, tuple[Cond, ...], str], ...] = (
    ("unassessed_hazard", (has("unsafe_ops"), lacks("site_cleared")),
     "The electrical hazard behind the control room has not been assessed by authorized staff."),
    ("uncontained_intrusion", (ne("containment", "full"),),
     "The intrusion is not fully contained; systems may fail again."),
    ("unverified_stock", (gt("provisional_units", 0),),
     "Part of the stock count rests on unverified digital records."),
    ("depot_unconfirmed", (has("depot_unverified"),),
     "The alternate depot's status and capacity are unconfirmed."),
    ("invoice_due", (has("credit_pending"),), "A deferred ₹2.0 lakh invoice falls due at 4:10 AM."),
    ("penalty_expected", (has("contract_breach"),), "A contractual penalty claim is expected."),
    ("budget_low", (lt("budget", 2.0),), "The emergency budget is almost exhausted."),
    ("time_low", (lt("window_min", 60),), "Less than an hour of dispatch slack remains."),
    ("injuries", (lt("staff_safety", 70),), "Staff injuries reduce labour and the safety margin."),
    ("evidence_poor", (lt("evidence_quality", 40),),
     "Evidence quality is poor; any attribution claim would be unsafe."),
    ("capacity_short", (lt("transport_capacity", 220),),
     "Transport capacity is below the hospitals' combined need."),
    ("trust_low", (lt("public_trust", 50),), "Public trust is low."),
)


def active_risks(state) -> list[dict[str, str]]:
    return [{"id": rid, "text": text} for rid, conds, text in RISKS if all(c.test(state) for c in conds)]
