"""Head starts a BLACKOUT workday can earn. Applied once, to the STARTING state of a new simulation; no engine rule, score or choice changes.

Each row is one thing the player set up on the ordinary Monday (see sims/workdays.py). Doing it well gives the full `add`; doing it halfway gives half.
The bonuses are small and bounded on purpose: preparation helps, it does not decide the game.
"""
from __future__ import annotations

from dataclasses import dataclass

from .rules import Fx, apply_effects
from .state import WorldState


@dataclass(frozen=True)
class Prep:
    flag: str
    part_flag: str
    label: str
    earned: str
    missed: str
    add: dict[str, float]
    shows: tuple[str, ...]      # the same bonus in words, for the interval page
    task: str


ITEMS: tuple[Prep, ...] = (
    Prep("prep_briefing", "prep_briefing_part", "A team that knows who owns what",
         "The five of you met that morning and agreed who owns what.", "There was no morning briefing, so ownership of the first hour will be settled by argument.",
         {"trust.nisha": 8}, ("Operations Manager's trust +8",), "Morning briefing (07:30)"),
    Prep("prep_patch", "prep_patch_part", "Servers patched with a rollback plan",
         "The overdue servers were patched, and the rollback plan was tested.", "The older servers were left as they were.",
         {"system_integrity": 10}, ("System integrity +10",), "The patching request (09:00)"),
    Prep("prep_backup", "prep_backup_part", "A backup that has actually been restored",
         "You tested a real restore of the yard system, and wrote down how long it takes.", "Nobody has ever restored a backup, so nobody knows if they work.",
         {"evidence_quality": 8}, ("Evidence quality +8",), "Do the backups work? (10:30)"),
    Prep("prep_contacts", "", "A call list that does not need the systems",
         "Urgent customers have a named contact and a phone tree on paper.", "Urgent customers only have a general email address.",
         {"trust.isha": 10, "public_trust": 4}, ("Customer Representative's trust +10", "Customer trust +4"), "A call from a customer (12:00)"),
    Prep("prep_manual", "prep_manual_part", "A gate team that has done the paper routine",
         "The gate team has run the paper-process drill once and fixed the forms.", "The gate team has never worked without screens.",
         {"trust.kavya": 10}, ("Terminal Supervisor's trust +10",), "A paper-process drill (14:00)"),
    Prep("prep_segmentation", "prep_segmentation_part", "The yard network separated from the office network",
         "The first separation point between the two networks is in place.", "Office and yard networks are still connected for convenience.",
         {"system_integrity": 5}, ("System integrity +5",), "The network request (15:30)"),
    Prep("prep_supplier", "", "A second carrier on standby",
         "A second trucking company has agreed short-notice terms, and its number is on the paper list.", "One carrier moves almost everything urgent, and there is no plan B.",
         {"supplier_confidence": 10}, ("Supplier confidence +10",), "The backup carrier (17:00)"),
)


def apply_prep(state: WorldState, flags) -> None:
    """Earn the head starts for the given `prep_*` flags on a brand-new state."""
    have = set(flags)
    for it in ITEMS:
        if it.flag in have:
            apply_effects(state, (Fx(add=dict(it.add), on=(it.flag,)),))
        elif it.part_flag and it.part_flag in have:
            apply_effects(state, (Fx(add={k: v / 2 for k, v in it.add.items()}, on=(it.part_flag,)),))
