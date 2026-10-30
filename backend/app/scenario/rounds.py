"""BLACKOUT story content: ten rounds and their choices. Pure data, no logic.

Units: budget in lakh rupees (L), time in minutes of dispatch slack (`window_min`).
Every number below is an explicit, documented state change (see docs/RULES.md).
"""
from __future__ import annotations

from dataclasses import dataclass

from ..engine.rules import Cond, Fx, eq, gt, gte, has, lacks, lt, ne


@dataclass(frozen=True)
class Choice:
    id: str
    label: str
    summary: str
    consequence: str
    cost: float = 0.0          # lakh, required and deducted
    time_cost: int = 0         # minutes of slack consumed
    effects: tuple[Fx, ...] = ()
    requires: tuple[tuple[Cond, str], ...] = ()  # (condition, reason shown when unavailable)
    confirm: bool = False      # UI asks for confirmation


@dataclass(frozen=True)
class Round:
    number: int
    clock: str
    title: str
    brief: str
    environment: str
    characters: tuple[tuple[str, str], ...]   # (character id, expression)
    info: tuple[tuple[tuple[Cond, ...], str], ...]  # (conditions, text) known to the player
    choices: tuple[Choice, ...]
    effects_overlay: tuple[str, ...] = ()


R1 = Round(
    1, "8:40 PM", "THE BLACKOUT",
    "The inventory dashboard goes dark. Barcode scanners fall silent across the warehouse floor. "
    "Arjun has noticed authentication activity that doesn't look like any of your own staff.",
    "warehouse_floor", (("arjun", "worried"), ("player", "determined")),
    (((), "Inventory dashboard offline; barcode scanners are not responding."),
     ((), "Arjun: unusual authentication attempts appear in the access logs. Cause unknown."),
     ((), "Emergency response budget: ₹{budget} lakh. Every action costs time before the 6:00 AM dispatch.")),
    (
        Choice("r1_isolate", "Isolate affected systems and preserve evidence",
               "Disconnect the affected systems, image logs and scanners. Slower, but evidence stays clean.",
               "Systems are contained and evidence is preserved, at the cost of some operating capacity and time.",
               cost=0.5, time_cost=40,
               effects=(Fx(set={"containment": "full"},
                           add={"evidence_quality": 25, "system_integrity": 10, "recovery_progress": 5,
                                "labour_pct": -10, "trust.arjun": 10}),)),
        Choice("r1_controlled", "Attempt controlled recovery while monitoring",
               "Recover systems in stages with monitoring. Partial containment.",
               "Recovery begins under monitoring; containment is only partial.",
               cost=1.0, time_cost=20,
               effects=(Fx(set={"containment": "partial"},
                           add={"evidence_quality": 10, "system_integrity": 5, "recovery_progress": 15,
                                "trust.arjun": 3}),)),
        Choice("r1_rush", "Prioritize immediate restoration of operations",
               "Restore everything now. Fastest, but overwrites logs and risks reinfection.",
               "Systems are rushed back online. Logs were overwritten and containment was skipped.",
               cost=1.5, time_cost=0,
               effects=(Fx(set={"containment": "none"},
                           add={"evidence_quality": -20, "system_integrity": -10, "recovery_progress": 30,
                                "trust.arjun": -10}, on=("rushed_restore",)),)),
    ),
    effects_overlay=("power_failure", "system_alert"),
)

R2 = Round(
    2, "9:05 PM", "SMOKE BEHIND THE CONTROL ROOM",
    "A worker reports smoke near an electrical panel behind the control room. Kavya is already "
    "on the radio.",
    "electrical_area", (("kavya", "angry"), ("player", "worried")),
    (((), "Smoke reported near an electrical panel. Cause and extent unknown."),
     ((), "Kavya: no one should be near that panel until it has been assessed.")),
    (
        Choice("r2_evacuate", "Evacuate the affected area and contact emergency responders",
               "Clear the area, call the fire service and electrical authority.",
               "The area is evacuated and responders certify it. Labour drops, but no one is exposed.",
               cost=0.3, time_cost=30,
               effects=(Fx(set={"facility": "evacuated"}, add={"labour_pct": -25, "trust.kavya": 15},
                           on=("evacuated", "responders_called", "site_cleared")),)),
        Choice("r2_secure", "Secure the area while authorized personnel assess",
               "Cordon off the area; the licensed electrician and safety team assess it.",
               "The area is cordoned and assessed by authorized staff, with minor exposure risk.",
               cost=0.2, time_cost=20,
               effects=(Fx(set={"facility": "isolated"},
                           add={"labour_pct": -10, "staff_safety": -3, "trust.kavya": 5},
                           on=("assessed", "site_cleared")),)),
        Choice("r2_maintain", "Keep operating elsewhere while the area stays isolated",
               "Maintain operations; no formal assessment or responder call.",
               "Operations continue, but no one with authority has assessed the hazard.",
               time_cost=0, confirm=True,
               effects=(Fx(set={"facility": "smoke"}, add={"staff_safety": -20, "trust.kavya": -20},
                           on=("unsafe_ops",)),)),
    ),
    effects_overlay=("smoke", "warning_lights"),
)

R3 = Round(
    3, "9:35 PM", "THE ROAD DISAPPEARS",
    "The monsoon has taken the primary highway. Raghav's maps show brown water where the road used to be.",
    "flooded_highway", (("raghav", "worried"), ("player", "calm")),
    (((), "The primary route is flooded; normal transport capacity is lost."),
     ((), "The two hospitals together need about {hospital_need} units. Transport capacity before the flood: {transport_capacity} units."),
     ((), "Raghav can offer three options, but his depot information is from earlier this evening.")),
    (
        Choice("r3_alt_transport", "Pay for alternative transport",
               "Charter high-clearance vehicles. Expensive, but a known capacity.",
               "Chartered transport secures capacity for 300 units at a significant cost.",
               cost=4.0, time_cost=10,
               effects=(Fx(set={"transport_capacity": 300}, add={"trust.raghav": 5}, on=("route_alt_paid",)),)),
        Choice("r3_divert_depot", "Divert through another depot",
               "Route stock via the alternate depot. Cheaper, but depot status is unconfirmed.",
               "Stock will move via the alternate depot (about 240 units), subject to what Raghav's scouts find.",
               cost=1.5, time_cost=45,
               effects=(Fx(set={"transport_capacity": 240}, add={"trust.raghav": 3},
                           on=("depot_diverted", "depot_unverified")),)),
        Choice("r3_reserve_hospital", "Reserve available vehicles for the most urgent hospital deliveries",
               "Commit the few vehicles that can get through to hospital runs only.",
               "A small fleet is reserved for hospitals (170 units). Other customers will wait.",
               cost=0.5, time_cost=5,
               effects=(Fx(set={"transport_capacity": 170},
                           add={"trust.isha": 10, "supplier_confidence": -3}, on=("hospital_reserved",)),)),
    ),
    effects_overlay=("rain",),
)

R4 = Round(
    4, "10:15 PM", "THE NUMBERS DON'T MATCH",
    "The last reliable report lists 480 units. The floor count, done by hand, is incomplete and already "
    "disagrees with the dashboard.",
    "warehouse_floor", (("arjun", "worried"), ("kavya", "calm"), ("player", "determined")),
    (((), "Last reliable report: 480 units. Physical count is incomplete."),
     ((gte("evidence_quality", 60),), "Because systems were isolated early, pre-outage barcode logs are trustworthy. Verification will be faster."),
     ((lt("evidence_quality", 40),), "The logs were overwritten; the digital records cannot be cross-checked."),
     ((), "Units physically verified so far: {verified_units}.")),
    (
        Choice("r4_pause", "Pause dispatch until reconciliation",
               "Hold everything until a full physical count is done.",
               "A thorough count confirms a large share of stock, but it takes over an hour.",
               cost=0.3, time_cost=75,
               effects=(Fx(add={"verified_units": 250, "evidence_quality": 15}),
                        Fx(add={"verified_units": 40}, when=(gte("evidence_quality", 60),)))),
        Choice("r4_release_verified", "Release independently verified batches",
               "Count and release batches as each is independently verified.",
               "A good portion of stock is verified and can move; the rest stays uncertain.",
               cost=0.2, time_cost=35,
               effects=(Fx(add={"verified_units": 170, "evidence_quality": 8}),
                        Fx(add={"verified_units": 30}, when=(gte("evidence_quality", 60),)))),
        Choice("r4_provisional", "Use digital records provisionally while arranging more checks",
               "Trust the dashboard for now; spot checks later. Fast, but records may overstate stock.",
               "Provisional digital records add apparent stock, but they are unverified and may be wrong.",
               cost=0.4, time_cost=10,
               effects=(Fx(add={"verified_units": 90, "provisional_units": 190, "evidence_quality": -10},
                           on=("provisional_records",)),)),
    ),
)

R5 = Round(
    5, "11:00 PM", "THE EMERGENCY BUDGET",
    "Nisha lays out the numbers: only ₹12 lakh was released for the response. "
    "Transport, IT recovery, facility repairs, a temporary depot and outside technical support are all asking for it.",
    "ops_office", (("nisha", "worried"), ("player", "exhausted")),
    (((), "Remaining emergency budget: ₹{budget} lakh. Money spent now cannot be spent later."),
     ((), "Transport capacity: {transport_capacity} units. The hospitals together need {hospital_need} units."),
     ((), "Nisha: staged spending keeps options open. Large early commitments cannot be undone."),
     ((has("depot_unverified"),), "Raghav's depot status is still unconfirmed."),
     ((lt("budget", 6),), "Budget is already tight; only the smaller packages are affordable.")),
    (
        Choice("r5_minimal", "Spend only the essentials and hold the rest",
               "₹1.0 lakh on essentials. Keeps maximum flexibility.",
               "Minimal spending preserves cash for later needs; progress is slow.",
               cost=1.0,
               effects=(Fx(add={"recovery_progress": 5, "trust.nisha": 10}, on=("reserve_held",)),)),
        Choice("r5_balanced", "Staged balanced package: repairs, IT and some transport",
               "₹6.0 lakh: facility repairs, IT recovery, +60 transport capacity. Hold the remainder.",
               "Balanced spending fixes the facility and improves recovery while holding a reserve.",
               cost=6.0,
               effects=(Fx(set={"facility": "cleared"},
                           add={"recovery_progress": 15, "system_integrity": 10, "transport_capacity": 60,
                                "evidence_quality": 5, "trust.nisha": 5},
                           on=("site_cleared", "reserve_held")),)),
        Choice("r5_restoration", "Commit heavily to restoration and repairs",
               "₹8.5 lakh: IT recovery, facility repairs and independent technical support.",
               "Systems and facility recover quickly, but most of the budget is now gone.",
               cost=8.5, confirm=True,
               effects=(Fx(set={"facility": "cleared"},
                           add={"recovery_progress": 35, "system_integrity": 20, "evidence_quality": 10,
                                "trust.nisha": -15, "trust.arjun": 10},
                           on=("site_cleared", "spent_heavy_early")),)),
        Choice("r5_logistics", "Logistics first: alternative transport and a temporary depot",
               "₹6.0 lakh: +140 transport capacity and a verified temporary depot.",
               "Transport capacity rises sharply and depot status is confirmed; recovery lags.",
               cost=6.0, time_cost=10,
               effects=(Fx(add={"transport_capacity": 140, "trust.raghav": 10},
                           on=("depot_verified",), off=("depot_unverified",)),)),
        Choice("r5_negotiated", "Negotiate payment terms: spend ₹4.0 lakh now, rest on invoice",
               "IT recovery and transport now; ₹2.0 lakh deferred to be paid at 4:10 AM.",
               "Partial coverage now, but a ₹2.0 lakh invoice falls due later.",
               cost=4.0,
               effects=(Fx(add={"recovery_progress": 15, "system_integrity": 5, "transport_capacity": 60,
                                "trust.nisha": -5, "supplier_confidence": -3}, on=("credit_pending",)),)),
    ),
)

R6 = Round(
    6, "11:45 PM", "THE HIDDEN CONNECTION",
    "Arjun finds repeated logins from a third-party logistics account. It is suspicious. It is not proof.",
    "control_room", (("arjun", "determined"), ("player", "calm")),
    (((), "Logs show access via a third-party logistics (3PL) account at the time of the outage."),
     ((), "Arjun: this does not establish who caused the outage. The account may have been compromised itself."),
     ((gte("evidence_quality", 60),), "Evidence quality is good: logs are intact and attributable."),
     ((lt("evidence_quality", 40),), "Evidence quality is poor: much of the log trail was overwritten.")),
    (
        Choice("r6_restrict", "Restrict the suspicious account and contain affected systems",
               "Disable the 3PL account and quarantine what it touched. No accusations.",
               "The account is restricted and containment tightens; the 3PL partner is unhappy.",
               time_cost=20,
               effects=(Fx(set={"containment": "full"},
                           add={"evidence_quality": 15, "trust.arjun": 8, "supplier_confidence": -5},
                           on=("account_restricted",)),)),
        Choice("r6_specialist", "Obtain specialist incident-response support",
               "Bring in an outside incident-response team (₹2.0 lakh).",
               "Specialists secure the evidence and strengthen recovery.",
               cost=2.0, time_cost=35,
               effects=(Fx(set={"containment": "full"},
                           add={"evidence_quality": 30, "system_integrity": 10, "recovery_progress": 10,
                                "trust.arjun": 10}, on=("ir_engaged",)),)),
        Choice("r6_parallel", "Prioritize restoration while investigating in parallel",
               "Keep restoring; investigate on a separate track.",
               "Restoration continues, but investigating a live system is harder on evidence.",
               time_cost=5,
               effects=(Fx(add={"recovery_progress": 15}, on=("parallel_investigation",)),
                        Fx(add={"evidence_quality": -10}, when=(ne("containment", "full"),)),
                        Fx(add={"evidence_quality": 5}, when=(eq("containment", "full"),)))),
    ),
)

R7 = Round(
    7, "1:00 AM", "THE HOSPITAL ULTIMATUM",
    "Dr. Kapoor has two hospitals waiting. Another customer is threatening contractual penalties "
    "unless their order ships as promised.",
    "hospital_corridor", (("isha", "angry"), ("player", "worried")),
    (((), "Two hospitals need a combined {hospital_need} units. A contract customer holds a {contract_need}-unit order."),
     ((), "Verified stock: {verified_units} units. Transport capacity: {transport_capacity} units."),
     ((gte("public_trust", 60), gte("supplier_confidence", 55)),
      "Your standing with customers is good enough that a negotiated split may be accepted."),
     ((lt("public_trust", 60),), "Customer goodwill is low; a negotiation may not hold.")),
    (
        Choice("r7_hospital_first", "Prioritize verified urgent hospital requirements",
               "Hospitals first; accept the contractual penalty.",
               "Hospitals get stock first. The contract customer will claim a penalty.",
               effects=(Fx(set={"priority": "hospital_first"},
                           add={"trust.isha": 15, "public_trust": 5, "supplier_confidence": -5},
                           on=("contract_breach",)),)),
        Choice("r7_commitments", "Follow existing order commitments",
               "Ship in order-date sequence; hospitals receive what remains.",
               "Contracts are honoured, but the hospitals' needs are served last.",
               effects=(Fx(set={"priority": "contract_first"},
                           add={"trust.isha": -20, "public_trust": -10, "supplier_confidence": 5},
                           on=("hospitals_deprioritized",)),)),
        Choice("r7_negotiate", "Negotiate partial deliveries across customers",
               "Offer everyone part of their order now, the rest later.",
               "Negotiation succeeds if customers still trust you; otherwise it fails and hurts.",
               cost=0.2, time_cost=25,
               effects=(
                   Fx(set={"priority": "split"}, add={"trust.isha": 3},
                      when=(gte("public_trust", 60), gte("supplier_confidence", 55))),
                   Fx(set={"priority": "contract_first"},
                      add={"trust.isha": -5, "supplier_confidence": -5, "public_trust": -3},
                      on=("contract_breach", "negotiation_failed"), when=(lt("public_trust", 60),)),
                   Fx(set={"priority": "contract_first"},
                      add={"trust.isha": -5, "supplier_confidence": -5, "public_trust": -3},
                      on=("contract_breach", "negotiation_failed"),
                      when=(gte("public_trust", 60), lt("supplier_confidence", 55))),
               )),
    ),
)

R8 = Round(
    8, "2:20 AM", "A SECOND PROBLEM",
    "Backup power starts to flicker. At the alternate depot, staff cannot confirm every storage location.",
    "alt_depot", (("kavya", "worried"), ("raghav", "exhausted"), ("player", "determined")),
    (((), "Backup power is unreliable."),
     ((has("depot_unverified"),), "The alternate depot cannot verify every storage location."),
     ((has("site_cleared"),), "The main site has been cleared as safe."),
     ((lacks("site_cleared"),), "The main site has NOT been cleared as safe: restricted operations are not permitted.")),
    (
        Choice("r8_transfer", "Transfer verified stock to the alternate depot",
               "Move stock closer to the road. Costs ₹1.0 lakh.",
               "Transport capacity improves, but stock moved into unverified storage must be rechecked.",
               cost=1.0, time_cost=35,
               effects=(Fx(add={"transport_capacity": 40, "trust.raghav": 3}, on=("depot_transfer",)),
                        Fx(add={"verified_units": -30, "evidence_quality": -5}, when=(has("depot_unverified"),)))),
        Choice("r8_restricted", "Maintain restricted operations (site cleared as safe)",
               "Keep a minimal crew working under restrictions.",
               "Limited operations continue under restrictions, but backup power is a risk.",
               time_cost=10,
               requires=((has("site_cleared"), "The site has not been cleared as safe by an authorized assessment."),),
               effects=(Fx(add={"staff_safety": -4, "trust.kavya": -5}, on=("restricted_ops",)),)),
        Choice("r8_suspend", "Suspend dispatch until safety and inventory checks are complete",
               "Stop, check everything, then resume.",
               "Checks complete: better verified and no new risk, but you've lost an hour.",
               time_cost=60,
               effects=(Fx(add={"verified_units": 60, "evidence_quality": 10,
                                "trust.kavya": 10, "public_trust": -3}, on=("dispatch_suspended",)),)),
    ),
    effects_overlay=("power_failure", "emergency_lighting"),
)

R9 = Round(
    9, "4:10 AM", "THE STORY LEAKS",
    "A news outlet reports that equipment is missing and that a cyberattack may be to blame. "
    "Your phone does not stop ringing.",
    "press_scene", (("player", "exhausted"), ("isha", "worried")),
    (((), "Reporters are asking about missing equipment and a possible cyberattack."),
     ((lt("evidence_quality", 50),), "You do not yet have enough evidence to confirm a cyberattack."),
     ((gte("evidence_quality", 70),), "You hold solid evidence to answer specific questions.")),
    (
        Choice("r9_holding", "Issue a factual holding statement",
               "State what is known, what is not, and when you'll update.",
               "A short factual statement steadies public trust.",
               cost=0.2, time_cost=5,
               effects=(Fx(add={"public_trust": 8, "trust.isha": 3, "supplier_confidence": 3}, on=("factual_statement",)),)),
        Choice("r9_wait", "Wait until the investigation establishes more facts",
               "Say nothing until the facts are in.",
               "Silence is read as concealment; trust falls.",
               effects=(Fx(add={"public_trust": -15, "supplier_confidence": -10}, on=("silence",)),
                        Fx(add={"public_trust": 7}, when=(gte("evidence_quality", 70),)))),
        Choice("r9_briefing", "Arrange a coordinated briefing with incident leads",
               "Safety, IT and logistics leads speak with one voice. Works only if they agree.",
               "A united briefing reassures, unless the leads disagree with you.",
               cost=0.3, time_cost=20,
               effects=(Fx(add={"public_trust": 12, "evidence_quality": 5}, on=("coordinated_briefing",),
                           when=(gte("trust.arjun", 40), gte("trust.kavya", 40))),
                        Fx(add={"public_trust": 4, "supplier_confidence": -3}, on=("leads_disagreed",),
                           when=(lt("trust.arjun", 40),)),
                        Fx(add={"public_trust": 4, "supplier_confidence": -3}, on=("leads_disagreed",),
                           when=(gte("trust.arjun", 40), lt("trust.kavya", 40))))),
    ),
)

R10 = Round(
    10, "6:00 AM", "THE FINAL DISPATCH",
    "The trucks are idling. Every earlier decision now decides how many units actually leave the gate.",
    "loading_dock", (("player", "determined"), ("raghav", "calm"), ("isha", "calm")),
    (((), "Verified stock: {verified_units} units. Provisional (unverified) digital records: {provisional_units} units."),
     ((), "Transport capacity: {transport_capacity} units. Time slack remaining: {window_min} min."),
     ((lt("window_min", 30),), "There is almost no time left; a final sweep may not fit.")),
    (
        Choice("r10_verified", "Dispatch verified stock only",
               "Ship only what has been physically confirmed.",
               "Only verified units leave the gate.",
               effects=(Fx(on=("final_verified",)),)),
        Choice("r10_sweep", "Final physical sweep, then dispatch",
               "30 minutes to physically confirm remaining stock, including provisional records.",
               "A last sweep confirms extra stock before the trucks leave.",
               time_cost=30,
               requires=((gte("window_min", 30), "Not enough time slack left for a 30-minute sweep."),),
               effects=(Fx(add={"verified_units": 60}, on=("final_sweep",)),)),
        Choice("r10_provisional", "Dispatch including provisional digital records",
               "Ship against records that haven't been verified. Shortfalls will be visible to customers.",
               "Provisional units ship, and any record that was wrong will become a visible shortfall.",
               requires=((gt("provisional_units", 0), "There are no provisional records to dispatch."),),
               confirm=True,
               effects=(Fx(on=("final_provisional",)),)),
    ),
)

ROUNDS: dict[int, Round] = {r.number: r for r in (R1, R2, R3, R4, R5, R6, R7, R8, R9, R10)}
