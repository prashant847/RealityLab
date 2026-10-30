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
    1: {"layout": "three", "panels": [
        _p("r1a", "warehouse_floor", effects=("power_failure", "warning_lights"),
           narration="8:40 PM. Every screen on the warehouse floor goes dark at once."),
        _p("r1b", "warehouse_floor", chars=(("arjun", "worried", "left"), ("player", "determined", "right")),
           dialogue=(("arjun", "Scanners are dead. And these logins — none of them are ours.", "speech"),)),
        _p("r1c", "control_room", chars=(("arjun", "calm", "left"),), effects=("system_alert",),
           dialogue=(("arjun", "I can't tell you what this is yet. Only that it isn't routine.", "speech"),)),
    ]},
    2: {"layout": "two", "panels": [
        _p("r2a", "electrical_area", effects=("smoke", "warning_lights"),
           narration="9:05 PM. Smoke curls from behind panel 4."),
        _p("r2b", "electrical_area", chars=(("kavya", "angry", "left"), ("player", "worried", "right")),
           effects=("smoke",),
           dialogue=(("kavya", "Nobody goes near that panel until it has been assessed!", "shout"),)),
    ]},
    3: {"layout": "three", "panels": [
        _p("r3a", "flooded_highway", effects=("rain",), narration="9:35 PM. The primary route is under water."),
        _p("r3b", "flooded_highway", chars=(("raghav", "worried", "left"), ("player", "calm", "right")), effects=("rain",),
           dialogue=(("raghav", "Brown water to the guard rails. I have three ways to move stock. None are clean.", "speech"),)),
        _p("r3c", "alt_depot", chars=(("raghav", "pointing", "left"),),
           dialogue=(("raghav", "The depot data is from this evening. I'd call it a good guess.", "speech"),)),
    ]},
    4: {"layout": "two", "panels": [
        _p("r4a", "warehouse_floor", chars=(("arjun", "worried", "left"), ("kavya", "calm", "right")),
           dialogue=(("arjun", "The dashboard says 480 units. The racks are only half counted.", "speech"),)),
        _p("r4b", "warehouse_floor", chars=(("player", "determined", "center"),), effects=("damaged_inventory",),
           narration="Which number do you trust?",
           dialogue=(("player", "480 on paper. Whatever is really on those shelves.", "thought"),)),
    ]},
    5: {"layout": "two", "panels": [
        _p("r5a", "ops_office", chars=(("nisha", "worried", "left"), ("player", "exhausted", "right")),
           dialogue=(("nisha", "₹12 lakh is everything released tonight. Spend it now and it's gone at 4 AM.", "speech"),)),
        _p("r5b", "ops_office", chars=(("player", "exhausted", "center"),),
           dialogue=(("player", "Transport, IT, repairs, a depot. We can't have it all.", "thought"),)),
    ]},
    6: {"layout": "revelation", "panels": [
        _p("r6a", "control_room", chars=(("arjun", "determined", "left"), ("player", "calm", "right")),
           effects=("system_alert",), emphasis="revelation",
           narration="11:45 PM. Suspicious — but not proof.",
           dialogue=(("arjun", "A third-party logistics account. Repeated logins, right at the outage.", "speech"),)),
    ]},
    7: {"layout": "two", "panels": [
        _p("r7a", "hospital_corridor", chars=(("isha", "angry", "left"), ("player", "worried", "right")),
           dialogue=(("isha", "Two hospitals, hours from running out of monitors. And a customer is quoting penalties.", "shout"),)),
        _p("r7b", "loading_dock", chars=(("player", "worried", "center"),),
           dialogue=(("player", "Everyone has a claim. Not everyone has a patient.", "thought"),)),
    ]},
    8: {"layout": "three", "panels": [
        _p("r8a", "alt_depot", effects=("power_failure", "emergency_lighting"),
           narration="2:20 AM. The lights stutter. Backup power is failing."),
        _p("r8b", "electrical_area", chars=(("kavya", "worried", "left"),), effects=("emergency_lighting",),
           dialogue=(("kavya", "If that generator drops with people inside, there won't be a second warning.", "speech"),)),
        _p("r8c", "alt_depot", chars=(("raghav", "exhausted", "left"),),
           dialogue=(("raghav", "And half the bays here I can't verify.", "radio"),)),
    ]},
    9: {"layout": "two", "panels": [
        _p("r9a", "press_scene", effects=("warning_lights",),
           narration="4:10 AM. Headline: equipment missing, cyberattack suspected."),
        _p("r9b", "ops_office", chars=(("isha", "worried", "left"), ("player", "determined", "right")),
           dialogue=(("isha", "The hospitals are calling. They've seen it.", "speech"),)),
    ]},
    10: {"layout": "single", "panels": [
        _p("r10a", "loading_dock",
           chars=(("raghav", "calm", "left"), ("player", "determined", "center"), ("isha", "calm", "right")),
           narration="6:00 AM. The trucks are idling.",
           dialogue=(("raghav", "Tell me what's on the manifest and I'll get it out the gate.", "speech"),)),
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
