"""Difficulty of the profession simulations (Bhopal, the hospital and the three ordinary days). BLACKOUT has its own engine and is not touched here.

Why this exists: as first written, the careful option in every round was also the first, the longest and the only one with no cost, so picking
the first (or the longest) option won every simulation. This module makes good decisions cost something, makes the weaker ones hurt more, turns
some rounds into real dilemmas where no option is perfect, and tightens the endings. It runs once, when a scenario module is loaded, and never at
play time, so the same choices still always give the same result.

  * strong options keep most of their benefit but lose some of it; mixed options gain less and lose more; weak options lose more, and keep
    the short-term gain that makes them tempting;
  * in a DILEMMA round the careful option is rated "mixed" (it has a cost that is written into its consequence), the middle option is rated
    "weak", and there is no strong option: the best available choice is a trade-off;
  * the documented history of Bhopal (Part 1) is a question about reading the record, not a decision under pressure, and is left alone.
"""
from __future__ import annotations

from dataclasses import replace

from .engine import RANK, Choice, Round, Scenario, best_choice

# (gain kept, loss multiplied) for the effects of each kind of option
SCALE = {"strong": (0.8, 1.2), "mixed": (0.6, 1.3), "weak": (1.0, 1.3), "dilemma": (0.65, 1.25)}

# Round id -> what the best available option costs. Added to its consequence, so the report and the Archivist say it too.
DILEMMAS = {
    "c2": "It costs staff time you do not have, and a few patients still wait.",
    "c7": "But the ward runs short-handed for days, and some patients wait longer.",
    "f2": "Head office is unhappy, and the cost targets are missed.",
    "f5": "The neighbours are alarmed, and some of your own staff question the call.",
    "cw5": "It takes three meetings and some goodwill you will want later.",
    "cw7": "The round is an hour late, and not everyone agrees with the result.",
    "bw4": "The job slips a week, and the contractor will remember.",
    "bw5": "You spend a lot of goodwill, and next time it will be harder.",
    "bow2": "Two teams lose a morning and complain.",
    "bow5": "It also stops the quay for an hour, and one customer notices.",
}

# Endings are earned, not given. Conditions replace the first draft's, ending by ending.
ENDING_CONDS: dict[str, dict[str, tuple]] = {
    "covid": {"held": (("gte", "care", 80), ("gte", "wellbeing", 68), ("gte", "trust", 70)), "strained": (("gte", "care", 52),)},
    "bhopal": {"release": (("gte", "hazard", 68),), "near_miss": (("gte", "hazard", 26),)},
    "covid_workday": {"ready": (("gte", "prepared", 80),), "partly": (("gte", "prepared", 40),)},
    "bhopal_workday": {"ready": (("gte", "prepared", 80),), "partly": (("gte", "prepared", 40),)},
    "blackout_workday": {"ready": (("gte", "prepared", 80),), "partly": (("gte", "prepared", 40),)},
}


def _scale(effects: dict[str, int], kind: str) -> dict[str, int]:
    up, down = SCALE[kind]
    out: dict[str, int] = {}
    for k, v in effects.items():
        if k == "prepared" or v == 0:
            out[k] = v
        elif v > 0:
            out[k] = max(1, round(v * up))
        else:
            out[k] = min(-1, round(v * down))
    return out


def _tune_choice(c: Choice, kind: str, **changes) -> Choice:
    return replace(c, effects=_scale(c.effects, kind), **changes)


def _dilemma(r: Round, note: str) -> Round:
    out = []
    for c in r.choices:
        if c.rating == "strong":
            effects = _scale(c.effects, "dilemma")
            if "prepared" in effects:
                effects["prepared"] = 10
            skills = {k: (v - 1 if v >= 2 else v) for k, v in c.skills.items()}
            out.append(replace(c, rating="mixed", effects=effects, skills=skills, consequence=f"{c.consequence} {note}"))
        elif c.rating == "mixed":
            effects = _scale(c.effects, "weak")
            if "prepared" in effects:
                effects["prepared"] = 4
            out.append(replace(c, rating="weak", effects=effects))
        else:
            out.append(_tune_choice(c, "weak"))
    return replace(r, choices=tuple(out))


def tune(sc: Scenario) -> Scenario:
    rounds = []
    for r in sc.rounds:
        if r.kind == "documented":
            rounds.append(r)
        elif r.id in DILEMMAS:
            rounds.append(_dilemma(r, DILEMMAS[r.id]))
        else:
            rounds.append(replace(r, choices=tuple(_tune_choice(c, c.rating) for c in r.choices)))
    endings = tuple(replace(e, conds=ENDING_CONDS.get(sc.id, {}).get(e.id, e.conds)) for e in sc.endings)
    return replace(sc, rounds=tuple(rounds), endings=endings)
