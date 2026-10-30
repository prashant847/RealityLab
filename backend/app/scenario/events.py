"""Data-driven consequence events. They fire when the simulation *enters* a round.

An event can fire once, in any round of [first_round, last_round] where its conditions hold and
its seeded roll succeeds. Failing conditions in one round does not cancel it: it can be delayed
into a later round of its window, or skipped entirely.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..engine.rules import Cond, Fx, eq, gte, has, lacks, lt, ne


@dataclass(frozen=True)
class Event:
    id: str
    title: str
    first_round: int
    last_round: int
    narrative: str
    effects: tuple[Fx, ...]
    conditions: tuple[Cond, ...] = ()
    probability: float = 1.0
    priority: int = 0                 # higher fires first
    recovery_note: str = ""           # how the player can recover from it
    assets: tuple[str, ...] = ()      # renderer asset ids
    opportunity: str = ""             # for rewarding events: what earns it (shown if it never happened)
    opportunity_if: tuple[Cond, ...] = ()   # only mention the opportunity if these hold in the final state


EVENTS: tuple[Event, ...] = (
    Event("secondary_interruption", "Systems fail again", 2, 4,
          "The restored systems drop offline a second time. Without full containment the intrusion "
          "was never closed. Another 25 minutes are lost.",
          (Fx(add={"system_integrity": -15, "recovery_progress": -15, "window_min": -25, "evidence_quality": -10}),),
          conditions=(eq("containment", "none"),), probability=0.8, priority=5,
          recovery_note="Full containment or specialist support closes the gap.",
          assets=("system_alert", "power_failure")),
    Event("secondary_interruption_partial", "A brief relapse", 2, 4,
          "A monitored subsystem trips again. Partial containment caught it quickly, but it cost time.",
          (Fx(add={"system_integrity": -5, "window_min": -10}),),
          conditions=(eq("containment", "partial"),), probability=0.3, priority=4,
          assets=("system_alert",)),
    Event("flare_up", "The panel catches", 3, 5,
          "The unassessed electrical panel flares. Two workers are hurt before it is isolated. "
          "Kavya is on the radio and she is not happy.",
          (Fx(set={"facility": "hazard"},
              add={"staff_safety": -35, "labour_pct": -20, "window_min": -20, "public_trust": -5,
                   "trust.kavya": -10}, on=("staff_injured",), off=("site_cleared",)),),
          conditions=(has("unsafe_ops"),), probability=0.85, priority=10,
          recovery_note="Facility repairs and an authorized assessment are needed before restricted operations.",
          assets=("sparks", "smoke", "warning_lights")),
    Event("panel_failure_evacuated", "The panel fails, nobody is near it", 3, 5,
          "The panel you evacuated fails. Nobody is hurt, and responders contain it. Some floor time is lost.",
          (Fx(add={"window_min": -10, "labour_pct": -5}),),
          conditions=(has("evacuated"),), probability=0.6, priority=9, assets=("sparks",)),
    Event("panel_failure_assessed", "The panel fails during assessment", 3, 5,
          "The panel fails while the electrician is still assessing it. A minor burn, and lost time.",
          (Fx(add={"staff_safety": -8, "window_min": -10}),),
          conditions=(has("assessed"),), probability=0.6, priority=9, assets=("sparks",)),
    Event("dock_flooding", "Water at the loading dock", 3, 4,
          "Floodwater reaches the loading dock. Pallets on the lower racks are lost: 20 units written off.",
          (Fx(add={"true_units": -20}),),
          probability=0.5, priority=3, assets=("rain", "damaged_inventory")),
    Event("depot_scout_report", "Raghav's scouts report back", 4, 5,
          "Raghav's scouts confirm that two of the alternate depot's bays are underwater. "
          "The earlier information was out of date; the route carries 40 fewer units.",
          (Fx(add={"transport_capacity": -40, "trust.raghav": -8}),),
          conditions=(has("depot_unverified"),), priority=6,
          recovery_note="A verified temporary depot (R5) removes this uncertainty."),
    Event("provisional_shortage", "The records overstated stock", 5, 6,
          "A spot check finds the digital records overstated stock; 20 provisional units don't exist.",
          (Fx(add={"provisional_units": -20, "evidence_quality": -10, "public_trust": -3}),),
          conditions=(has("provisional_records"),), probability=0.7, priority=4),
    Event("hospital_escalation", "Dr. Kapoor escalates", 6, 7,
          "With transport capacity below the hospitals' combined need, Dr. Kapoor escalates her concerns.",
          (Fx(add={"public_trust": -3, "trust.isha": -5}),),
          conditions=(lt("transport_capacity", 220),), priority=2),
    Event("insurer_advance", "Insurer fast-tracks funds", 6, 8,
          "Your well-documented evidence earns a fast-tracked insurer advance of ₹1.5 lakh.",
          (Fx(add={"budget": 1.5, "trust.nisha": 5}),),
          conditions=(gte("evidence_quality", 75),), priority=3,
          opportunity="Strong, well-documented evidence earns a fast-tracked insurer advance (₹1.5 lakh)."),
    Event("reinfection_alert", "Intrusion resurfaces", 7, 8,
          "The suspicious account is still live. Activity resumes and a segment must be rebuilt.",
          (Fx(add={"system_integrity": -10, "recovery_progress": -10, "evidence_quality": -10, "window_min": -20}),),
          conditions=(lacks("account_restricted"), lacks("ir_engaged"), ne("containment", "full")),
          probability=0.6, priority=5, assets=("system_alert",)),
    Event("verified_route_pays_off", "The verified route holds", 7, 8,
          "Because the alternate depot was verified, the diversion carries 30 more units than planned.",
          (Fx(add={"transport_capacity": 30}),),
          conditions=(has("depot_verified"), has("depot_diverted")), priority=2,
          opportunity="Confirming the alternate depot you diverted through adds 30 units of route capacity.",
          opportunity_if=(has("depot_diverted"),)),
    Event("contract_penalty_notice", "Penalty notice arrives", 8, 9,
          "The contract customer files a penalty notice for ₹1.5 lakh.",
          (Fx(add={"budget": -1.5}, when=(gte("budget", 1.5),)),
           Fx(set={"budget": 0.0}, add={"supplier_confidence": -10}, on=("penalty_unpaid",),
              when=(lt("budget", 1.5),))),
          conditions=(has("contract_breach"),), priority=4),
    Event("power_dip", "Backup power dips", 9, 10,
          "Backup power dips while restricted operations are running. Systems reset and 15 minutes are lost.",
          (Fx(add={"system_integrity": -10, "window_min": -15}),),
          conditions=(has("restricted_ops"),), probability=0.4, priority=3,
          assets=("power_failure", "emergency_lighting")),
    Event("credit_due", "The deferred invoice falls due", 9, 9,
          "The vendor you negotiated with calls in the ₹2.0 lakh invoice.",
          (Fx(add={"budget": -2.0}, when=(gte("budget", 2.0),)),
           Fx(set={"budget": 0.0}, add={"supplier_confidence": -15}, on=("invoice_default",),
              when=(lt("budget", 2.0),))),
          conditions=(has("credit_pending"),), priority=6),
)
