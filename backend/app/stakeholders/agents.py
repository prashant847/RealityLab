"""The five non-player stakeholders as deterministic policies.

Each agent scores a choice by what it WOULD change (a dry-run preview from the real rules),
weighted by that agent's own priorities, plus hard constraints ("vetoes"). Opinions therefore
differ for principled, inspectable reasons, and are never produced by a language model.

An agent only reasons over what the player could see plus its own *private* knowledge
(`private_info`). Nobody sees the hidden true stock level.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from ..engine.state import WorldState
from ..scenario.rounds import Choice

Veto = Callable[[WorldState, WorldState, Choice], "str | None"]   # (before, after, choice) -> reason


@dataclass(frozen=True)
class PrivateFact:
    text: str
    reliability: float          # 0..1: how much this agent trusts the claim themselves
    verified: bool              # False = the player should check it before relying on it


@dataclass(frozen=True)
class Agent:
    id: str
    name: str
    role: str
    goals: tuple[str, ...]
    constraints: tuple[str, ...]
    style: str                                   # voice, for templates and the optional LLM
    weights: dict[str, float]                    # field (or "trust.x") -> utility per unit of change
    flags: dict[str, float]                      # flag newly set -> utility
    values: dict[str, float]                     # "field=value" newly reached -> utility
    phrases: dict[str, tuple[str, str]]          # key -> (why it's good, why it's bad)
    vetoes: tuple[Veto, ...]
    agrees_when: str
    disagrees_when: str
    facts: Callable[[WorldState], list[str]] = field(default=lambda s: [])
    private_info: Callable[[WorldState], list[PrivateFact]] = field(default=lambda s: [])
    uncertainty: Callable[[WorldState], tuple[int, str | None]] = field(default=lambda s: (0, None))


# ------------------------------------------------------------------ shared constraint
def _unsafe(before: WorldState, after: WorldState, c: Choice) -> str | None:
    if "unsafe_ops" in after.flags and "unsafe_ops" not in before.flags:
        return "it skips the emergency procedure"
    return None


def _kavya_untested_ops(before, after, c):
    if "restricted_ops" in after.flags and "site_cleared" not in after.flags:
        return "the site has not been cleared as safe"
    return None


def _arjun_no_containment(before, after, c):
    if before.containment != "none" and after.containment == "none":
        return "it throws away containment and overwrites evidence"
    if "rushed_restore" in after.flags and "rushed_restore" not in before.flags:
        return "restoring without containment can reintroduce the intrusion and destroys the logs"
    return None


def _nisha_overspend(before, after, c):
    if c.cost > 0 and after.budget < 1.5 and before.budget - c.cost < 1.5 and c.cost >= 3.0:
        return f"it leaves only ₹{after.budget:.1f} lakh, with nothing for the contingencies still ahead"
    return None


def _isha_contract_first(before, after, c):
    if after.priority == "contract_first" and before.priority != "contract_first":
        return "it puts a contract ahead of patients"
    return None


COMMON_VETOES: tuple[Veto, ...] = (_unsafe,)


# ------------------------------------------------------------------ public facts / private info
def _kavya_facts(s: WorldState) -> list[str]:
    return [f"Staff safety is {s.staff_safety}%.", f"Available labour is {s.labour_pct}%.",
            "The site has been cleared as safe." if "site_cleared" in s.flags else "The site has not been cleared as safe."]


def _kavya_private(s: WorldState) -> list[PrivateFact]:
    out = []
    if "unsafe_ops" in s.flags and "site_cleared" not in s.flags:
        out.append(PrivateFact("Panel 4 is still live and unassessed. I would rate a fault in the next few hours as likely.", 0.8, False))
    if "evacuated" in s.flags:
        out.append(PrivateFact("Responders have signed the area off, so I'm comfortable with the site.", 0.95, True))
    return out


def _arjun_facts(s: WorldState) -> list[str]:
    return [f"Containment is {s.containment}.", f"Evidence quality is {s.evidence_quality}%.", f"System integrity is {s.system_integrity}%."]


def _arjun_private(s: WorldState) -> list[PrivateFact]:
    if s.evidence_quality >= 60:
        return [PrivateFact("The logs are intact, so I can say what the account did, but not who was using it.", 0.85, True)]
    return [PrivateFact("Too much of the log trail is gone for me to say anything firm.", 0.9, True)]


def _arjun_uncertainty(s: WorldState):
    return (-15, "the log trail is too damaged for firm conclusions") if s.evidence_quality < 40 else (0, None)


def _nisha_facts(s: WorldState) -> list[str]:
    return [f"₹{s.budget:.1f} lakh of the emergency budget remains."]


def _nisha_private(s: WorldState) -> list[PrivateFact]:
    out, due = [], 0.0
    if "credit_pending" in s.flags:
        out.append(PrivateFact("A deferred ₹2.0 lakh invoice falls due at 4:10 AM.", 1.0, True)); due += 2.0
    if "contract_breach" in s.flags:
        out.append(PrivateFact("A ₹1.5 lakh contract penalty is expected.", 0.9, True)); due += 1.5
    if due:
        out.append(PrivateFact(f"Committed obligations leave about ₹{max(0.0, s.budget - due):.1f} lakh genuinely free.", 1.0, True))
    return out


def _nisha_uncertainty(s: WorldState):
    return (10, None)


def _raghav_claim(s: WorldState) -> tuple[int, bool]:
    """Raghav's capacity figure. While the depot is unconfirmed he is optimistic by 25 units."""
    unverified = "depot_unverified" in s.flags
    return (s.transport_capacity + (25 if unverified else 0), not unverified)


def _raghav_facts(s: WorldState) -> list[str]:
    return [f"There are {s.window_min} minutes of dispatch slack."]


def _raghav_private(s: WorldState) -> list[PrivateFact]:
    n, verified = _raghav_claim(s)
    if not verified:
        return [PrivateFact(f"I make our transport capacity about {n} units, but that leans on this evening's depot information. "
                            "Please verify it before relying on it.", 0.5, False)]
    return [PrivateFact(f"Transport capacity is {n} units and the route is confirmed.", 0.9, True)]


def _raghav_uncertainty(s: WorldState):
    return (-15, "the alternate depot's status is unconfirmed") if "depot_unverified" in s.flags else (0, None)


def _isha_facts(s: WorldState) -> list[str]:
    return [f"The two hospitals need {s.hospital_need} units between them.", f"{s.verified_units} units are verified so far."]


def _isha_private(s: WorldState) -> list[PrivateFact]:
    out = [PrivateFact("Both hospitals are down to their last spare monitors, and neither can wait for the next scheduled delivery.", 0.9, True)]
    if "contract_breach" in s.flags or s.contract_need:
        out.append(PrivateFact(f"The contract customer's {s.contract_need}-unit order carries a financial penalty, not a risk to patients.", 0.85, True))
    return out


def _isha_uncertainty(s: WorldState):
    return (-10, "so little stock is verified that I cannot promise anything") if s.verified_units < 100 else (0, None)


# ------------------------------------------------------------------ the agents
KAVYA = Agent(
    "kavya", "Kavya Rao", "Safety Chief",
    goals=("Keep every worker safe.", "Follow emergency and compliance procedure."),
    constraints=("Will not endorse work near an unassessed hazard.", "Will not endorse restricted operations before the site is cleared."),
    style="Blunt and procedural. Short sentences. Puts people before schedule.",
    weights={"staff_safety": 1.0, "labour_pct": 0.05, "window_min": 0.01},
    flags={"unsafe_ops": -40, "site_cleared": 10, "evacuated": 8, "assessed": 6, "restricted_ops": -8, "dispatch_suspended": 6},
    values={},
    phrases={"staff_safety": ("it protects the crew", "it puts staff at risk"), "site_cleared": ("the site gets properly cleared", "the site stays uncleared"),
             "evacuated": ("responders sign the area off", ""), "assessed": ("an authorized person assesses it", ""),
             "restricted_ops": ("", "running on unreliable backup power is a risk to people"), "dispatch_suspended": ("we stop and check before anyone is exposed", ""),
             "labour_pct": ("it keeps enough hands on site", "it strips the crew")},
    vetoes=(_kavya_untested_ops,),
    agrees_when="The choice follows emergency procedure and keeps people out of unassessed hazards.",
    disagrees_when="A choice trades safety margin for speed, or runs operations on an uncleared site.",
    facts=_kavya_facts, private_info=_kavya_private,
)
ARJUN = Agent(
    "arjun", "Arjun Mehta", "IT & Systems Lead",
    goals=("Contain the incident before restoring.", "Preserve evidence.", "Say only what the data supports."),
    constraints=("Will not endorse restoring over an uncontained intrusion.", "Will not state who is responsible without evidence."),
    style="Precise and careful. Separates what he knows from what he suspects. Never claims certainty.",
    weights={"evidence_quality": 0.8, "system_integrity": 0.5, "recovery_progress": 0.2, "window_min": 0.02},
    flags={"rushed_restore": -20, "ir_engaged": 10, "account_restricted": 6, "provisional_records": -8, "parallel_investigation": -3},
    values={"containment=full": 15, "containment=partial": 6, "containment=none": -12},
    phrases={"evidence_quality": ("it keeps the evidence usable", "it damages the evidence"), "system_integrity": ("it makes the systems sturdier", "it weakens the systems"),
             "containment=full": ("it contains the intrusion", ""), "rushed_restore": ("", "a rushed restore can bring the intrusion straight back"),
             "ir_engaged": ("specialists secure the trail", ""), "account_restricted": ("it shuts the suspicious account", ""),
             "provisional_records": ("", "records we cannot trust will mislead us"), "recovery_progress": ("it moves recovery forward", "")},
    vetoes=(_arjun_no_containment,),
    agrees_when="The choice contains first, restores second, and keeps the log trail intact.",
    disagrees_when="A choice restores systems or makes claims faster than the evidence allows.",
    facts=_arjun_facts, private_info=_arjun_private, uncertainty=_arjun_uncertainty,
)
NISHA = Agent(
    "nisha", "Nisha Sen", "Finance Director",
    goals=("Protect the emergency budget for what is still to come.", "Make every rupee justify itself."),
    constraints=("Will not endorse a package that leaves nothing for later contingencies.", "Will not endorse actions that create unbudgeted liability."),
    style="Numbers first. Dry, a little sceptical. Always asks what it leaves for later.",
    weights={"budget": 3.0, "supplier_confidence": 0.1},
    flags={"credit_pending": -8, "spent_heavy_early": -15, "reserve_held": 10, "contract_breach": -6, "unsafe_ops": -12, "staff_injured": -10},
    values={},
    phrases={"budget": ("it keeps cash in reserve", "it spends cash we may need later"), "credit_pending": ("", "deferred payment is still money we owe"),
             "spent_heavy_early": ("", "committing most of the budget this early leaves no room to react"), "reserve_held": ("it holds a reserve", ""),
             "contract_breach": ("", "it exposes us to a contract penalty"), "supplier_confidence": ("it keeps suppliers confident", "it unsettles suppliers")},
    vetoes=(_nisha_overspend,),
    agrees_when="Spending is staged, justified and leaves a reserve.",
    disagrees_when="Money is committed early, in large blocks, or against deferred obligations.",
    facts=_nisha_facts, private_info=_nisha_private, uncertainty=_nisha_uncertainty,
)
RAGHAV = Agent(
    "raghav", "Raghav Verma", "Logistics Manager",
    goals=("Get stock moving on routes that actually work.", "Protect delivery time."),
    constraints=("Reports what his scouts tell him, which is not always current.",),
    style="Practical and fast-talking. Optimistic about routes. Rounds numbers and sometimes forgets to say they're estimates.",
    weights={"transport_capacity": 0.15, "window_min": 0.05, "verified_units": 0.03},
    flags={"depot_verified": 8, "depot_unverified": -3, "route_alt_paid": 4, "depot_transfer": 3, "dispatch_suspended": -6, "hospital_reserved": -2},
    values={},
    phrases={"transport_capacity": ("it adds vehicles and route capacity", "it costs us carrying capacity"), "window_min": ("it saves time on the clock", "it burns time we need on the road"),
             "verified_units": ("there is more confirmed stock to load", ""), "depot_verified": ("it confirms the depot", ""),
             "depot_unverified": ("", "we'd be routing through a depot nobody has confirmed"), "dispatch_suspended": ("", "stopping dispatch costs us the road"),
             "route_alt_paid": ("it secures vehicles we know exist", ""), "depot_transfer": ("stock gets closer to the road", "")},
    vetoes=(),
    agrees_when="The choice adds capacity or saves time on the clock.",
    disagrees_when="A choice burns time or leaves capacity short of what the hospitals need.",
    facts=_raghav_facts, private_info=_raghav_private, uncertainty=_raghav_uncertainty,
)
ISHA = Agent(
    "isha", "Dr. Isha Kapoor", "Hospital Liaison",
    goals=("Get urgent equipment to the hospitals.", "Make prioritisation fair and visible."),
    constraints=("Will not endorse putting a contract ahead of patients.",),
    style="Urgent and human. Speaks for people who aren't in the room. Plain words, no jargon.",
    weights={"transport_capacity": 0.08, "verified_units": 0.05, "window_min": 0.04, "public_trust": 0.3, "trust.isha": 0.3},
    flags={"hospital_reserved": 12, "hospitals_deprioritized": -20, "factual_statement": 3, "contract_breach": 2, "dispatch_suspended": -2},
    values={"priority=hospital_first": 25, "priority=split": 8, "priority=contract_first": -25},
    phrases={"transport_capacity": ("it keeps trucks available for the hospitals", "it cuts the trucks available for the hospitals"),
             "verified_units": ("it confirms more stock for the hospitals", ""), "window_min": ("it gets equipment out sooner", "every minute lost is a minute the hospitals wait"),
             "priority=hospital_first": ("patients come first", ""), "priority=split": ("it gives everyone something", ""),
             "priority=contract_first": ("", "patients would wait behind a contract"), "hospital_reserved": ("vehicles are held for hospital runs", ""),
             "hospitals_deprioritized": ("", "hospitals would be served last"), "public_trust": ("it keeps the public informed", "it erodes public trust")},
    vetoes=(_isha_contract_first,),
    agrees_when="The choice gets verified stock to hospitals first, or keeps trucks and time for them.",
    disagrees_when="A choice delays hospital deliveries or ranks a contract above patients.",
    facts=_isha_facts, private_info=_isha_private, uncertainty=_isha_uncertainty,
)

AGENTS: dict[str, Agent] = {a.id: a for a in (KAVYA, ARJUN, NISHA, RAGHAV, ISHA)}
STAKEHOLDER_IDS = tuple(AGENTS)
