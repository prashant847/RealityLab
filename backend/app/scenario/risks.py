"""Active risks derived from visible state. Shown to the player and stored in checkpoints."""
from __future__ import annotations

from ..engine.rules import Cond, gt, has, lacks, lt, ne

RISKS: tuple[tuple[str, tuple[Cond, ...], str], ...] = (
    ("unassessed_hazard", (has("unsafe_ops"), lacks("site_cleared")),
     "The hazard at the terminal has not been checked by authorised staff."),
    ("uncontained_intrusion", (ne("containment", "full"),),
     "The attack is not fully contained; systems may fail again."),
    ("unverified_stock", (gt("provisional_units", 0),),
     "Part of the cargo count rests on unverified records."),
    ("depot_unconfirmed", (has("depot_unverified"),),
     "The alternate site's status and capacity are unconfirmed."),
    ("invoice_due", (has("credit_pending"),), "A deferred 2.0-point payment falls due later."),
    ("penalty_expected", (has("contract_breach"),), "A key account penalty claim is expected."),
    ("budget_low", (lt("budget", 2.0),), "Recovery effort is almost used up."),
    ("time_low", (lt("window_min", 60),), "Less than an hour remains before the reopening deadline."),
    ("injuries", (lt("staff_safety", 70),), "Staff injuries reduce labour and the safety margin."),
    ("evidence_poor", (lt("evidence_quality", 40),),
     "Evidence quality is poor; any claim about the cause would be unsafe."),
    ("capacity_short", (lt("transport_capacity", 220),),
     "Transport capacity is below what time-critical customers need."),
    ("trust_low", (lt("public_trust", 50),), "Customer trust is low."),
)


def active_risks(state) -> list[dict[str, str]]:
    return [{"id": rid, "text": text} for rid, conds, text in RISKS if all(c.test(state) for c in conds)]
