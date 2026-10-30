"""Deterministic dialogue. Used whenever no language model is configured or its output is rejected.
Variation is chosen by a seeded hash so the same situation always yields the same words."""
from __future__ import annotations

from typing import Any

from ..engine.rules import roll

OPENERS: dict[str, dict[str, tuple[str, ...]]] = {
    "kavya": {"firm": ("Procedure first.", "Let me be direct.", "People before schedule."), "unsure": ("I can't be sure from here.",)},
    "arjun": {"firm": ("Here's what I can say with confidence.", "I'll keep what I know apart from what I suspect."), "unsure": ("I want to be careful with this one.",)},
    "nisha": {"firm": ("Numbers first.", "Let me put this in rupees."), "unsure": ("I'd want more detail before committing.",)},
    "raghav": {"firm": ("Okay, road view.", "Quick take from logistics."), "unsure": ("Honestly, I'm working off old information.",)},
    "isha": {"firm": ("I'll be plain.", "Think about who is waiting."), "unsure": ("I can't promise anything yet.",)},
}
NO_PREF = {
    "kavya": "Nothing here changes the safety picture much either way.",
    "arjun": "From a systems point of view these are close.",
    "nisha": "Financially these are close, so I won't fight you on it.",
    "raghav": "Logistically there's not much between them.",
    "isha": "For the hospitals these don't differ much.",
}
REACT = {
    "challenge": ("I have to say I disagreed with ", "I'd have chosen differently on "),
    "agree": ("Good call on ", "I was glad you chose "),
    "mixed": ("I had mixed feelings about ",),
}


def _pick(options: tuple[str, ...], seed: int, key: str) -> str:
    return options[int(roll(seed, key) * len(options)) % len(options)]


def compose(core: dict[str, Any], seed: int) -> str:
    """Main advice paragraph, built only from the structured core."""
    sid, rnd = core["stakeholder"], core["round"]
    key = f"adv:{sid}:{rnd}"
    tone = "unsure" if core["uncertainty"] and core["confidence"] < 55 else "firm"
    parts = [_pick(OPENERS[sid][tone], seed, key + ":o")] if core["recommendation"] or tone == "unsure" else []
    if core["recommendation"]:
        parts.append(f"I'd go with “{core['recommendation_label']}”.")
        reasons = core["recommendation_reasons"]
        if reasons:
            parts.append(f"Mainly because {reasons[0]}" + (f" and {reasons[1]}." if len(reasons) > 1 else "."))
    else:
        parts.append(NO_PREF[sid])
    obj = core["objection"]
    if obj and obj["choice_id"] != core["recommendation"]:
        parts.append(f"I'd push back on “{obj['label']}”: {obj['why']}.")
    priv = core["private"][0] if core["private"] else None
    if priv:
        parts.append(priv["text"])
    if core["confidence"] < 55 and core["uncertainty"]:
        parts.append(f"Take that with caution: {core['uncertainty']}.")
    return " ".join(parts)


def compose_reaction(core: dict[str, Any], seed: int) -> str | None:
    r = core.get("reaction")
    if not r:
        return None
    lead = _pick(REACT[r["verdict"]], seed, f"rx:{core['stakeholder']}:{core['round']}")
    return f"{lead}“{r['label']}”: {r['why']}." if r["verdict"] != "agree" else f"{lead}“{r['label']}”, because {r['why']}."
