"""Comic page scripts: which panels each round shows, who is in them and what they say.

This is *content*, validated against the closed vocabularies below. The frontend renders only
these ids with trusted components; nothing here (or from an LLM later) can inject markup or SVG.
Dialogue here is the deterministic fallback; optional AI dialogue (Phase 7) must pass the same
validation before it is shown.
"""
from __future__ import annotations

from typing import Any

LAYOUTS = ("single", "two", "three", "revelation", "dialogue")
ENVIRONMENTS = ("warehouse_floor", "control_room", "electrical_area", "loading_dock", "ops_office",
                "hospital_corridor", "flooded_highway", "alt_depot", "press_scene")
CHARACTERS = ("player", "kavya", "arjun", "nisha", "raghav", "isha")
EXPRESSIONS = ("calm", "worried", "angry", "surprised", "determined", "exhausted", "speaking", "pointing")
EFFECTS = ("smoke", "sparks", "warning_lights", "rain", "power_failure", "damaged_inventory",
           "system_alert", "emergency_lighting")
BUBBLE_KINDS = ("speech", "thought", "shout", "radio")
SIDES = ("left", "center", "right")
MAX_TEXT = 160


def _p(pid: str, env: str, chars=(), effects=(), narration: str | None = None, dialogue=(), emphasis=None):
    return {
        "id": pid, "environment": env,
        "characters": [{"id": c, "expression": e, "side": s} for c, e, s in chars],
        "effects": list(effects), "narration": narration,
        "dialogue": [{"speaker": sp, "text": tx, "kind": k} for sp, tx, k in dialogue],
        "emphasis": emphasis,
    }


PAGES: dict[int, dict[str, Any]] = {
    # Narration is the narrator; dialogue is RECONSTRUCTED (a plausible dramatisation, never a quotation). Fictional roles only.
    1: {"layout": "three", "panels": [
        _p("r1a", "warehouse_floor", effects=("warning_lights",),
           narration="Tuesday 27 June 2017. Computers across the company begin to fail. Nobody inside yet knows this is not a fault."),
        _p("r1b", "warehouse_floor", chars=(("arjun", "worried", "left"), ("player", "determined", "right")),
           dialogue=(("arjun", "This isn't one machine. It's spreading from one to the next.", "speech"),)),
        _p("r1c", "control_room", chars=(("arjun", "calm", "left"),), effects=("system_alert",),
           dialogue=(("arjun", "I can't tell you what this is yet. Only that it isn't routine.", "speech"),)),
    ]},
    2: {"layout": "two", "panels": [
        _p("r2a", "electrical_area", effects=("warning_lights",),
           narration="Day 1. At the terminal, the cranes and gates have lost the systems that tell them what to do. Work falls back to paper and radio."),
        _p("r2b", "electrical_area", chars=(("kavya", "angry", "left"), ("player", "worried", "right")),
           dialogue=(("kavya", "Nobody works in that area until someone qualified has checked it!", "shout"),)),
    ]},
    3: {"layout": "three", "panels": [
        _p("r3a", "flooded_highway", narration="Day 2, 28 June. The company says the attack is contained. Outside the gates, the trucks keep coming."),
        _p("r3b", "flooded_highway", chars=(("raghav", "worried", "left"), ("player", "calm", "right")),
           dialogue=(("raghav", "I can reroute cargo three ways. None is clean.", "speech"),)),
        _p("r3c", "alt_depot", chars=(("raghav", "pointing", "left"),),
           dialogue=(("raghav", "What I know about the other site is hours old. Treat it as a good guess.", "speech"),)),
    ]},
    4: {"layout": "two", "panels": [
        _p("r4a", "loading_dock", chars=(("arjun", "worried", "left"), ("kavya", "calm", "right")),
           narration="Days 2 to 3. With the systems down, nobody can say exactly what is where.",
           dialogue=(("arjun", "The system says 480. The yard count is only half done.", "speech"),)),
        _p("r4b", "loading_dock", chars=(("player", "determined", "center"),), effects=("damaged_inventory",),
           narration="Which number do you trust?",
           dialogue=(("player", "480 on paper. And whatever is really in the yard.", "thought"),)),
    ]},
    5: {"layout": "two", "panels": [
        _p("r5a", "ops_office", chars=(("nisha", "worried", "left"), ("player", "exhausted", "right")),
           narration="Days 3 to 5. A huge rebuild is under way. There is only so much skill, and so many hours.",
           dialogue=(("nisha", "We have 12 points of effort in total. Spend it now and it's gone later.", "speech"),)),
        _p("r5b", "ops_office", chars=(("player", "exhausted", "center"),),
           dialogue=(("player", "Transport, IT, repairs, a temporary site. We can't have it all.", "thought"),)),
    ]},
    6: {"layout": "revelation", "panels": [
        _p("r6a", "control_room", chars=(("arjun", "determined", "left"), ("player", "calm", "right")),
           effects=("system_alert",), emphasis="revelation",
           narration="The pattern points to a trusted software update. Suspicious, but not proof.",
           dialogue=(("arjun", "A third-party update arrived just before the failures. It may have been tampered with.", "speech"),)),
    ]},
    7: {"layout": "two", "panels": [
        _p("r7a", "hospital_corridor", chars=(("isha", "angry", "left"), ("player", "worried", "right")),
           narration="Days 5 to 8. Capacity is short, and everyone wants to go first.",
           dialogue=(("isha", "Customers with urgent cargo are running out of time. And a key account is quoting penalties.", "shout"),)),
        _p("r7b", "loading_dock", chars=(("player", "worried", "center"),),
           dialogue=(("player", "Everyone has a claim. Not everyone has the same deadline.", "thought"),)),
    ]},
    8: {"layout": "three", "panels": [
        _p("r8a", "alt_depot", effects=("power_failure", "emergency_lighting"),
           narration="Days 5 to 9. The recovery rests on a few surviving pieces. The lights flicker."),
        _p("r8b", "electrical_area", chars=(("kavya", "worried", "left"),), effects=("emergency_lighting",),
           dialogue=(("kavya", "If the power drops with people inside, there won't be a second warning.", "speech"),)),
        _p("r8c", "alt_depot", chars=(("raghav", "exhausted", "left"),),
           dialogue=(("raghav", "And I can't confirm every connection at this site.", "radio"),)),
    ]},
    9: {"layout": "two", "panels": [
        _p("r9a", "press_scene", effects=("warning_lights",),
           narration="Days 6 to 10. Reporters ask whether this is a cyberattack, and when services will return."),
        _p("r9b", "ops_office", chars=(("isha", "worried", "left"), ("player", "determined", "right")),
           dialogue=(("isha", "Customers are calling. They've seen the news.", "speech"),)),
    ]},
    10: {"layout": "single", "panels": [
        _p("r10a", "loading_dock",
           chars=(("raghav", "calm", "left"), ("player", "determined", "center"), ("isha", "calm", "right")),
           narration="About Day 10. The core systems are back. Reopening is a promise customers will test.",
           dialogue=(("raghav", "Tell me which systems you trust, and I'll connect them.", "speech"),)),
    ]},
}


def page_for(round_no: int) -> dict[str, Any]:
    return PAGES[round_no]


def validate_page(page: dict[str, Any]) -> list[str]:
    """Return a list of problems (empty if valid). Used by tests and by any future generated content."""
    errs: list[str] = []
    if page.get("layout") not in LAYOUTS:
        errs.append(f"bad layout {page.get('layout')!r}")
    for p in page.get("panels", []):
        pid = p.get("id", "?")
        if p.get("environment") not in ENVIRONMENTS:
            errs.append(f"{pid}: bad environment {p.get('environment')!r}")
        for c in p.get("characters", []):
            if c["id"] not in CHARACTERS or c["expression"] not in EXPRESSIONS or c["side"] not in SIDES:
                errs.append(f"{pid}: bad character {c}")
        for e in p.get("effects", []):
            if e not in EFFECTS:
                errs.append(f"{pid}: bad effect {e!r}")
        for d in p.get("dialogue", []):
            if d["speaker"] not in CHARACTERS or d["kind"] not in BUBBLE_KINDS or len(d["text"]) > MAX_TEXT:
                errs.append(f"{pid}: bad dialogue {d}")
        if p.get("narration") and len(p["narration"]) > MAX_TEXT:
            errs.append(f"{pid}: narration too long")
    if not page.get("panels"):
        errs.append("no panels")
    return errs
