"""BLACKOUT: The NotPetya Incident. Ten rounds and their choices. Pure data, no logic.

The story is based on the 2017 NotPetya cyberattack and its impact on Maersk (see docs/NOTPETYA_OUTLINE_v2.md for sources and for which
parts are documented, reconstructed or simulation). The decisions and every number below are SIMULATION: they are explicit state changes
(see docs/RULES.md), not historical figures. Units: "recovery points" for effort (the `budget` state), "cargo lots" for stock, and minutes
of time left before the reopening deadline (`window_min`).
"""
from __future__ import annotations

from dataclasses import dataclass, replace

from ..engine.rules import Cond, Fx, eq, gt, gte, has, lacks, lt, ne


@dataclass(frozen=True)
class Choice:
    id: str
    label: str
    summary: str
    consequence: str
    cost: float = 0.0          # recovery points, required and deducted
    time_cost: int = 0         # minutes of time consumed
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
    1, "Day 1 · 27 Jun", "THE SCREENS GO DARK",
    "Computers across the company start to fail, one after another. The IT Lead says it does not look like an ordinary fault.",
    "warehouse_floor", (("arjun", "worried"), ("player", "determined")),
    (((), "Computers are going dark in a wave, and the failures are spreading between machines."),
     ((), "IT Lead: the cause is unknown, and this is not routine."),
     ((), "Recovery effort available: {budget} points. Every action costs time before the reopening deadline.")),
    (
        Choice("r1_isolate", "Cut the affected connections and keep the evidence",
               "Disconnect the affected systems and save the logs. Slower, but you keep proof of what happened.",
               "The spread slows and the evidence is kept, at the cost of some operating capacity and time.",
               cost=0.5, time_cost=40,
               effects=(Fx(set={"containment": "full"},
                           add={"evidence_quality": 25, "system_integrity": 10, "recovery_progress": 5,
                                "labour_pct": -10, "trust.arjun": 10}),)),
        Choice("r1_controlled", "Recover in stages while watching the spread",
               "Restore systems step by step with monitoring. Only partly contained.",
               "Recovery begins under watch; containment is only partial.",
               cost=1.0, time_cost=20,
               effects=(Fx(set={"containment": "partial"},
                           add={"evidence_quality": 10, "system_integrity": 5, "recovery_progress": 15,
                                "trust.arjun": 3}),)),
        Choice("r1_rush", "Bring everything back online as fast as possible",
               "Fastest, but it overwrites evidence and risks reinfection.",
               "Systems are rushed back. Evidence was overwritten and nothing was contained.",
               cost=1.5, time_cost=0,
               effects=(Fx(set={"containment": "none"},
                           add={"evidence_quality": -20, "system_integrity": -10, "recovery_progress": 30,
                                "trust.arjun": -10}, on=("rushed_restore",)),)),
    ),
    effects_overlay=("power_failure", "system_alert"),
)

R2 = Round(
    2, "Day 1 · 27 Jun", "RUNNING BLIND AT THE TERMINAL",
    "At the terminal, cranes and gates have lost the systems that tell them what to do. Work is falling back to paper and radios, "
    "and the Terminal Supervisor wants to know who may keep working.",
    "electrical_area", (("kavya", "angry"), ("player", "worried")),
    (((), "Terminal systems are down; work has fallen back to manual."),
     ((), "Terminal Supervisor: nobody works in an area until a qualified person has checked it.")),
    (
        Choice("r2_evacuate", "Clear the affected area and bring in the safety team",
               "Stop work there, clear people out and call the safety and equipment teams.",
               "The area is cleared and checked. Labour drops, but no one is exposed.",
               cost=0.3, time_cost=30,
               effects=(Fx(set={"facility": "evacuated"}, add={"labour_pct": -25, "trust.kavya": 15},
                           on=("evacuated", "responders_called", "site_cleared")),)),
        Choice("r2_secure", "Cordon the area and let a qualified lead check it",
               "Rope it off while the qualified safety lead checks the equipment.",
               "The area is cordoned off and checked by authorised staff, with a small risk of exposure.",
               cost=0.2, time_cost=20,
               effects=(Fx(set={"facility": "isolated"},
                           add={"labour_pct": -10, "staff_safety": -3, "trust.kavya": 5},
                           on=("assessed", "site_cleared")),)),
        Choice("r2_maintain", "Keep working manually elsewhere with no formal safety check",
               "Carry on. Nobody with authority checks the hazard.",
               "Work continues, but nobody with authority has checked the hazard.",
               time_cost=0, confirm=True,
               effects=(Fx(set={"facility": "smoke"}, add={"staff_safety": -20, "trust.kavya": -20},
                           on=("unsafe_ops",)),)),
    ),
    effects_overlay=("warning_lights",),
)

R3 = Round(
    3, "Day 2 · 28 Jun", "CARGO WITH NOWHERE TO GO",
    "The company says the attack is contained, but trucks keep arriving at terminals that cannot process them. "
    "The Network Administrator can offer three ways to move cargo, and none is perfect.",
    "flooded_highway", (("raghav", "worried"), ("player", "calm")),
    (((), "Normal routes into the terminals are blocked or jammed; normal transport capacity is lost."),
     ((), "Time-critical customers together need about {hospital_need} cargo lots. Transport capacity before the attack: {transport_capacity} lots."),
     ((), "The Network Administrator can offer three options, but his information on the alternate site is hours old.")),
    (
        Choice("r3_alt_transport", "Pay for extra transport capacity",
               "Hire more vehicles. Expensive, but the capacity is known.",
               "Hired transport secures room for 300 cargo lots at a high cost.",
               cost=4.0, time_cost=10,
               effects=(Fx(set={"transport_capacity": 300}, add={"trust.raghav": 5}, on=("route_alt_paid",)),)),
        Choice("r3_divert_depot", "Divert cargo through another site",
               "Route cargo via an alternate site. Cheaper, but its status is not confirmed.",
               "Cargo will move via the alternate site (about 240 lots), depending on what the scouts find.",
               cost=1.5, time_cost=45,
               effects=(Fx(set={"transport_capacity": 240}, add={"trust.raghav": 3},
                           on=("depot_diverted", "depot_unverified")),)),
        Choice("r3_reserve_hospital", "Keep the few usable vehicles for the most urgent cargo",
               "Commit the vehicles that can get through to time-critical customers only.",
               "A small fleet is reserved for urgent cargo (170 lots). Other customers will wait.",
               cost=0.5, time_cost=5,
               effects=(Fx(set={"transport_capacity": 170},
                           add={"trust.isha": 10, "supplier_confidence": -3}, on=("hospital_reserved",)),)),
    ),
    effects_overlay=(),
)

R4 = Round(
    4, "Days 2-3", "THE RECORDS DON'T MATCH",
    "The last reliable report lists 480 cargo lots. The count done by hand is incomplete and already disagrees with the system.",
    "loading_dock", (("arjun", "worried"), ("kavya", "calm"), ("player", "determined")),
    (((), "Last reliable report: 480 cargo lots. The physical count is incomplete."),
     ((gte("evidence_quality", 60),), "Because systems were cut off early, earlier logs are trustworthy. Checking will be faster."),
     ((lt("evidence_quality", 40),), "The logs were overwritten, so the records cannot be cross-checked."),
     ((), "Cargo lots physically verified so far: {verified_units}.")),
    (
        Choice("r4_pause", "Pause releases until a full count is done",
               "Hold everything until a complete physical count.",
               "A thorough count confirms a large share, but it takes over an hour.",
               cost=0.3, time_cost=75,
               effects=(Fx(add={"verified_units": 250, "evidence_quality": 15}),
                        Fx(add={"verified_units": 40}, when=(gte("evidence_quality", 60),)))),
        Choice("r4_release_verified", "Release batches as each is independently confirmed",
               "Count and release batch by batch.",
               "A good share is confirmed and can move; the rest stays uncertain.",
               cost=0.2, time_cost=35,
               effects=(Fx(add={"verified_units": 170, "evidence_quality": 8}),
                        Fx(add={"verified_units": 30}, when=(gte("evidence_quality", 60),)))),
        Choice("r4_provisional", "Use the last records provisionally and check later",
               "Trust the old records for now, with spot checks later. Fast, but they may overstate what is there.",
               "Provisional records add apparent cargo, but it is unverified and may be wrong.",
               cost=0.4, time_cost=10,
               effects=(Fx(add={"verified_units": 90, "provisional_units": 190, "evidence_quality": -10},
                           on=("provisional_records",)),)),
    ),
)

R5 = Round(
    5, "Days 3-5", "WHERE DOES THE EFFORT GO?",
    "The rebuild is huge. The Operations Manager lays out what it needs: transport, IT recovery, site repairs, a temporary site and outside "
    "technical help. Only 12 points of recovery effort are available.",
    "ops_office", (("nisha", "worried"), ("player", "exhausted")),
    (((), "Recovery effort left: {budget} points. Effort spent now cannot be spent later."),
     ((), "Transport capacity: {transport_capacity} cargo lots. Time-critical customers need {hospital_need} lots."),
     ((), "Operations Manager: spending in stages keeps options open. Large early commitments cannot be undone."),
     ((has("depot_unverified"),), "The alternate site's status is still unconfirmed."),
     ((lt("budget", 6),), "Effort is already tight; only the smaller packages are affordable.")),
    (
        Choice("r5_minimal", "Spend only the essentials and hold the rest",
               "1.0 points on essentials. Keeps the most flexibility.",
               "Minimal spending keeps effort in reserve; progress is slow.",
               cost=1.0,
               effects=(Fx(add={"recovery_progress": 5, "trust.nisha": 10}, on=("reserve_held",)),)),
        Choice("r5_balanced", "A balanced package: repairs, IT recovery and some transport",
               "6.0 points: site repairs, IT recovery, +60 transport capacity. Hold the rest.",
               "Balanced spending fixes the site and speeds recovery while keeping a reserve.",
               cost=6.0,
               effects=(Fx(set={"facility": "cleared"},
                           add={"recovery_progress": 15, "system_integrity": 10, "transport_capacity": 60,
                                "evidence_quality": 5, "trust.nisha": 5},
                           on=("site_cleared", "reserve_held")),)),
        Choice("r5_restoration", "Commit heavily to restoration and repairs",
               "8.5 points: IT recovery, site repairs and outside technical support.",
               "Systems and site recover quickly, but most of the effort is gone.",
               cost=8.5, confirm=True,
               effects=(Fx(set={"facility": "cleared"},
                           add={"recovery_progress": 35, "system_integrity": 20, "evidence_quality": 10,
                                "trust.nisha": -15, "trust.arjun": 10},
                           on=("site_cleared", "spent_heavy_early")),)),
        Choice("r5_logistics", "Logistics first: extra transport and a temporary site",
               "6.0 points: +140 transport capacity and a verified temporary site.",
               "Transport capacity rises sharply and the site is confirmed; recovery lags.",
               cost=6.0, time_cost=10,
               effects=(Fx(add={"transport_capacity": 140, "trust.raghav": 10},
                           on=("depot_verified",), off=("depot_unverified",)),)),
        Choice("r5_negotiated", "Negotiate payment terms: 4.0 points now, the rest later",
               "IT recovery and transport now; 2.0 points deferred until later.",
               "Partial cover now, but a 2.0-point payment falls due later.",
               cost=4.0,
               effects=(Fx(add={"recovery_progress": 15, "system_integrity": 5, "transport_capacity": 60,
                                "trust.nisha": -5, "supplier_confidence": -3}, on=("credit_pending",)),)),
    ),
)

R6 = Round(
    6, "Days 2-6", "HOW DID IT GET IN?",
    "While recovery goes on, the IT Lead finds that the failures began soon after a trusted third-party software update was installed. "
    "It is suspicious. It is not proof.",
    "control_room", (("arjun", "determined"), ("player", "calm")),
    (((), "Logs show a third-party software update arriving just before the failures."),
     ((), "IT Lead: this does not prove who is behind it. The update may itself have been tampered with."),
     ((gte("evidence_quality", 60),), "Evidence quality is good: logs are intact and attributable."),
     ((lt("evidence_quality", 40),), "Evidence quality is poor: much of the log trail was overwritten.")),
    (
        Choice("r6_restrict", "Block the third-party update path and contain what it reached",
               "Disable the update route and isolate what it touched. No accusations.",
               "The route is blocked and containment tightens; the software supplier is unhappy.",
               time_cost=20,
               effects=(Fx(set={"containment": "full"},
                           add={"evidence_quality": 15, "trust.arjun": 8, "supplier_confidence": -5},
                           on=("account_restricted",)),)),
        Choice("r6_specialist", "Bring in outside incident specialists",
               "Call in an outside response team (2.0 points).",
               "Specialists secure the evidence and strengthen recovery.",
               cost=2.0, time_cost=35,
               effects=(Fx(set={"containment": "full"},
                           add={"evidence_quality": 30, "system_integrity": 10, "recovery_progress": 10,
                                "trust.arjun": 10}, on=("ir_engaged",)),)),
        Choice("r6_parallel", "Keep restoring while investigating in parallel",
               "Keep restoring; investigate on a separate track.",
               "Restoration continues, but investigating live systems is harder on evidence.",
               time_cost=5,
               effects=(Fx(add={"recovery_progress": 15}, on=("parallel_investigation",)),
                        Fx(add={"evidence_quality": -10}, when=(ne("containment", "full"),)),
                        Fx(add={"evidence_quality": 5}, when=(eq("containment", "full"),)))),
    ),
)

R7 = Round(
    7, "Days 5-8", "WHOSE CARGO MOVES FIRST?",
    "Capacity is short. Time-critical customers are waiting, and a key account customer is threatening penalties unless its order ships as promised.",
    "hospital_corridor", (("isha", "angry"), ("player", "worried")),
    (((), "Time-critical customers need a combined {hospital_need} cargo lots. A key account holds a {contract_need}-lot order."),
     ((), "Verified cargo: {verified_units} lots. Transport capacity: {transport_capacity} lots."),
     ((gte("public_trust", 60), gte("supplier_confidence", 55)),
      "Your standing with customers is good enough that a negotiated split may be accepted."),
     ((lt("public_trust", 60),), "Customer goodwill is low; a negotiation may not hold.")),
    (
        Choice("r7_hospital_first", "Put verified time-critical cargo first",
               "Time-critical customers first; accept the contract penalty.",
               "Time-critical customers get cargo first. The key account will claim a penalty.",
               effects=(Fx(set={"priority": "hospital_first"},
                           add={"trust.isha": 15, "public_trust": 5, "supplier_confidence": -5},
                           on=("contract_breach",)),)),
        Choice("r7_commitments", "Follow existing order commitments",
               "Ship in order-date sequence; time-critical customers get what remains.",
               "Contracts are honoured, but time-critical customers are served last.",
               effects=(Fx(set={"priority": "contract_first"},
                           add={"trust.isha": -20, "public_trust": -10, "supplier_confidence": 5},
                           on=("hospitals_deprioritized",)),)),
        Choice("r7_negotiate", "Negotiate partial deliveries across customers",
               "Offer everyone part of their order now and the rest later.",
               "Negotiation works if customers still trust you; otherwise it fails and hurts.",
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
    8, "Days 5-9", "A FRAGILE FALLBACK",
    "The recovery now leans on a few surviving pieces. Backup power at the recovery site is unreliable, "
    "and the alternate site cannot confirm everything it holds.",
    "alt_depot", (("kavya", "worried"), ("raghav", "exhausted"), ("player", "determined")),
    (((), "Backup power is unreliable."),
     ((has("depot_unverified"),), "The alternate site cannot verify every storage location."),
     ((has("site_cleared"),), "The main site has been cleared as safe."),
     ((lacks("site_cleared"),), "The main site has NOT been cleared as safe: restricted operations are not permitted.")),
    (
        Choice("r8_transfer", "Move verified work to the alternate site",
               "Move cargo closer to the road. Costs 1.0 points.",
               "Transport capacity improves, but cargo moved into unverified storage must be rechecked.",
               cost=1.0, time_cost=35,
               effects=(Fx(add={"transport_capacity": 40, "trust.raghav": 3}, on=("depot_transfer",)),
                        Fx(add={"verified_units": -30, "evidence_quality": -5}, when=(has("depot_unverified"),)))),
        Choice("r8_restricted", "Keep a minimal crew working under restrictions (site cleared as safe)",
               "Keep a small crew working under restrictions.",
               "Limited work continues, but unreliable power is a risk.",
               time_cost=10,
               requires=((has("site_cleared"), "The site has not been cleared as safe by an authorised check."),),
               effects=(Fx(add={"staff_safety": -4, "trust.kavya": -5}, on=("restricted_ops",)),)),
        Choice("r8_suspend", "Pause everything until safety and cargo checks are complete",
               "Stop, check everything, then restart.",
               "Checks complete: better verified and no new risk, but an hour is lost.",
               time_cost=60,
               effects=(Fx(add={"verified_units": 60, "evidence_quality": 10,
                                "trust.kavya": 10, "public_trust": -3}, on=("dispatch_suspended",)),)),
    ),
    effects_overlay=("power_failure", "emergency_lighting"),
)

R9 = Round(
    9, "Days 6-10", "THE STORY GETS OUT",
    "Reporters are asking whether this is a cyberattack and what it means for customers. The phones do not stop ringing.",
    "press_scene", (("player", "exhausted"), ("isha", "worried")),
    (((), "Reporters are asking whether this is a cyberattack and when services will return."),
     ((lt("evidence_quality", 50),), "You do not yet have enough evidence to confirm the cause."),
     ((gte("evidence_quality", 70),), "You hold solid evidence to answer specific questions.")),
    (
        Choice("r9_holding", "Issue a short factual holding statement",
               "Say what is known, what is not, and when you will update.",
               "A short factual statement steadies customer trust.",
               cost=0.2, time_cost=5,
               effects=(Fx(add={"public_trust": 8, "trust.isha": 3, "supplier_confidence": 3}, on=("factual_statement",)),)),
        Choice("r9_wait", "Wait until the investigation establishes more facts",
               "Say nothing until the facts are in.",
               "Silence is read as hiding something; trust falls.",
               effects=(Fx(add={"public_trust": -15, "supplier_confidence": -10}, on=("silence",)),
                        Fx(add={"public_trust": 7}, when=(gte("evidence_quality", 70),)))),
        Choice("r9_briefing", "Arrange a joint briefing with the incident leads",
               "IT, terminal and customer leads speak with one voice. Works only if they agree.",
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
    10, "About Day 10", "REOPENING",
    "The gates are about to reopen. Every earlier decision now decides how much cargo can safely move.",
    "loading_dock", (("player", "determined"), ("raghav", "calm"), ("isha", "calm")),
    (((), "Verified cargo: {verified_units} lots. Provisional (unverified) records: {provisional_units} lots."),
     ((), "Transport capacity: {transport_capacity} lots. Time left before reopening: {window_min} min."),
     ((lt("window_min", 30),), "There is almost no time left; a final check may not fit.")),
    (
        Choice("r10_verified", "Reopen on verified cargo only",
               "Move only what has been physically confirmed.",
               "Only verified cargo moves.",
               effects=(Fx(on=("final_verified",)),)),
        Choice("r10_sweep", "One last physical check, then reopen",
               "30 minutes to confirm the remaining cargo, including provisional records.",
               "A last check confirms extra cargo before the gates reopen.",
               time_cost=30,
               requires=((gte("window_min", 30), "Not enough time left for a 30-minute check."),),
               effects=(Fx(add={"verified_units": 60}, on=("final_sweep",)),)),
        Choice("r10_provisional", "Reopen including the provisional records",
               "Move cargo on records that have not been verified. Shortfalls will be visible to customers.",
               "Provisional cargo moves, and any wrong record becomes a visible shortfall.",
               requires=((gt("provisional_units", 0), "There are no provisional records to use."),),
               confirm=True,
               effects=(Fx(on=("final_provisional",)),)),
    ),
)

# Extra story lines for players who did the ordinary-day workday first. They only appear when the matching `prep_*` flag is set,
# so a game without a workday reads exactly as before.
PREP_INFO: dict[int, tuple[tuple[tuple[Cond, ...], str], ...]] = {
    1: (((has("prep_briefing"),), "The five of you met yesterday morning, so everyone already knows who owns what."),
        ((has("prep_manual"),), "Yesterday's paper-process drill means the gate team knows the manual routine.")),
    2: (((has("prep_manual"),), "The paper forms from the drill are in the gatehouse drawer, and the radio net has been tried."),),
    3: (((has("prep_contacts"),), "The urgent-customer call list you set up works without the systems."),
        ((has("prep_supplier"),), "The second carrier you called has a standby arrangement.")),
    6: (((has("prep_backup"),), "Yesterday's restore test means you know the offline copies exist, and that a restore takes about fifty minutes."),
        ((has("prep_segmentation"),), "The first separation point you approved is holding the yard network apart from the office network."),
        ((has("prep_patch"),), "The servers you patched are not among the first to fall.")),
    7: (((has("prep_contacts"),), "Urgent customers have your named contact, so they are calling the right number."),),
}
ROUNDS: dict[int, Round] = {
    r.number: (replace(r, info=r.info + PREP_INFO[r.number]) if r.number in PREP_INFO else r)
    for r in (R1, R2, R3, R4, R5, R6, R7, R8, R9, R10)
}
