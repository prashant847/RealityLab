"""Generic, deterministic scenario engine used by the Bhopal and hospital simulations.

A Scenario is data: meters, rounds with choices, conditional events and ending rules. All state changes happen here (never in the
frontend); the same choices always give the same result. BLACKOUT keeps its own engine in app/engine and is not touched by this module.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable

SKILLS = {
    "decision_making": "Decision-making", "problem_solving": "Problem-solving", "communication": "Communication",
    "prioritization": "Prioritization", "teamwork": "Teamwork", "risk_management": "Risk management",
    "ethical_judgment": "Ethical judgment", "adaptability": "Adaptability",
}

# A condition is a tuple: ("flag", f) | ("no_flag", f) | ("lt", meter, v) | ("gte", meter, v)
Cond = tuple


@dataclass(frozen=True)
class Meter:
    id: str
    label: str
    start: int
    good: str = "high"          # "high": more is better; "low": less is better
    hint: str = ""


@dataclass(frozen=True)
class Choice:
    id: str
    label: str
    summary: str
    consequence: str
    rating: str                  # strong | mixed | weak: how well the reasoning holds up (never "what history did")
    effects: dict[str, int] = field(default_factory=dict)
    flags: tuple[str, ...] = ()
    requires: tuple[tuple[Cond, str], ...] = ()      # (condition, reason shown when locked)
    skills: dict[str, int] = field(default_factory=dict)   # skill -> -2..+2 evidence from this decision
    lesson: str = ""


@dataclass(frozen=True)
class Round:
    id: str
    title: str
    clock: str
    kind: str                    # documented | hypothetical | simulation
    brief: str
    question: str
    facts: tuple[str, ...]
    choices: tuple[Choice, ...]
    part: str = ""               # e.g. "Part 1 · The historical record"
    scene: str = ""              # name of the scene the frontend draws
    sources: tuple[str, ...] = ()


@dataclass(frozen=True)
class Event:
    id: str
    at_round: int                # fires when this round (1-based) begins
    title: str
    text: str
    conds: tuple[Cond, ...] = ()
    effects: dict[str, int] = field(default_factory=dict)
    flags: tuple[str, ...] = ()
    kind: str = "simulation"


@dataclass(frozen=True)
class Ending:
    id: str
    title: str
    text: str
    conds: tuple[Cond, ...] = ()     # first ending whose conditions all hold wins; the last one has none
    tone: str = "neutral"            # good | neutral | bad


@dataclass(frozen=True)
class PrepItem:
    """Something a workday can set up for the crisis. `flag` = done well, `part_flag` = done halfway (half the effect)."""
    flag: str
    label: str
    earned: str                  # shown when set up (interval page, crisis story)
    missed: str                  # shown when not set up
    effects: dict[str, int] = field(default_factory=dict)
    part_flag: str = ""
    task: str = ""               # the workday step that earns it, for the interval page


@dataclass(frozen=True)
class Scenario:
    id: str
    title: str
    tagline: str
    role: str
    domain: str
    minutes: int
    description: str
    objectives: tuple[str, ...]
    intro: tuple[str, ...]
    disclaimer: str
    meters: tuple[Meter, ...]
    rounds: tuple[Round, ...]
    events: tuple[Event, ...]
    endings: tuple[Ending, ...]
    lessons: tuple[str, ...]
    sources: tuple[tuple[str, str], ...] = ()
    next_up: tuple[str, ...] = ()
    kind: str = "crisis"                         # "workday" (an ordinary day) or "crisis" (the main simulation)
    profession: str = ""                         # the career this scenario belongs to: blackout | bhopal | covid
    prep: tuple[PrepItem, ...] = ()              # crisis only: what a workday can set up
    interval: tuple[str, ...] = ()               # crisis only: the story that bridges workday and crisis


class SimError(Exception):
    code = "sim_error"


class InvalidChoice(SimError):
    code = "invalid_decision"


class Finished(SimError):
    code = "simulation_finished"


def new_state(sc: Scenario, prep: Iterable[str] = ()) -> dict[str, Any]:
    st: dict[str, Any] = {"round": 1, "status": "active", "meters": {m.id: m.start for m in sc.meters}, "flags": [],
                          "decisions": [], "events": [], "ending": None, "prepared": []}
    have = set(prep)
    for item in sc.prep:
        full = item.flag in have
        if full or (item.part_flag and item.part_flag in have):
            eff = item.effects if full else {k: v // 2 for k, v in item.effects.items()}
            _apply(st, eff, (item.flag if full else item.part_flag,))
            st["prepared"].append({"flag": item.flag, "label": item.label, "text": item.earned, "full": full, "effects": eff})
    _fire(sc, st)
    return st


def test(st: dict[str, Any], c: Cond) -> bool:
    k = c[0]
    if k == "flag": return c[1] in st["flags"]
    if k == "no_flag": return c[1] not in st["flags"]
    if k == "lt": return st["meters"][c[1]] < c[2]
    if k == "gte": return st["meters"][c[1]] >= c[2]
    raise ValueError(k)


def _clamp(v: int) -> int:
    return max(0, min(100, v))


def _apply(st: dict[str, Any], effects: dict[str, int], flags: tuple[str, ...]) -> dict[str, list[int]]:
    before = dict(st["meters"])
    for k, d in effects.items():
        st["meters"][k] = _clamp(st["meters"][k] + d)
    for f in flags:
        if f not in st["flags"]:
            st["flags"] = sorted([*st["flags"], f])
    return {k: [before[k], v] for k, v in st["meters"].items() if before[k] != v}


def _fire(sc: Scenario, st: dict[str, Any]) -> None:
    st["round_events"] = []
    for ev in sc.events:
        if ev.at_round == st["round"] and all(test(st, c) for c in ev.conds):
            d = _apply(st, ev.effects, ev.flags)
            rec = {"event_id": ev.id, "round": st["round"], "title": ev.title, "text": ev.text, "kind": ev.kind, "changes": d}
            st["events"].append(rec)
            st["round_events"].append(rec)


def current_round(sc: Scenario, st: dict[str, Any]) -> Round:
    return sc.rounds[st["round"] - 1]


def availability(st: dict[str, Any], c: Choice) -> tuple[bool, str]:
    for cond, why in c.requires:
        if not test(st, cond):
            return False, why
    return True, ""


def decide(sc: Scenario, st: dict[str, Any], choice_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    """Returns (new_state, outcome). The input is never modified."""
    import copy
    if st["status"] != "active":
        raise Finished("This simulation has already finished.")
    rnd = current_round(sc, st)
    ch = next((c for c in rnd.choices if c.id == choice_id), None)
    if ch is None:
        raise InvalidChoice(f"'{choice_id}' is not an option in this step.")
    ok, why = availability(st, ch)
    if not ok:
        raise InvalidChoice(why)
    s = copy.deepcopy(st)
    changes = _apply(s, ch.effects, ch.flags)
    s["decisions"].append({"round": rnd.id, "n": s["round"], "title": rnd.title, "choice_id": ch.id, "label": ch.label,
                           "rating": ch.rating, "consequence": ch.consequence, "lesson": ch.lesson, "changes": changes,
                           "skills": ch.skills, "kind": rnd.kind, "part": rnd.part})
    if s["round"] >= len(sc.rounds):
        s["status"] = "completed"
        s["round_events"] = []
        s["ending"] = next(e.id for e in sc.endings if all(test(s, c) for c in e.conds))
    else:
        s["round"] += 1
        _fire(sc, s)
    return s, {"choice_id": ch.id, "label": ch.label, "rating": ch.rating, "consequence": ch.consequence, "lesson": ch.lesson,
               "changes": changes, "completed": s["status"] == "completed", "events": list(s.get("round_events", []))}


def scene_view(sc: Scenario, st: dict[str, Any]) -> dict[str, Any]:
    base = {"meters": [{"id": m.id, "label": m.label, "value": st["meters"][m.id], "good": m.good, "hint": m.hint} for m in sc.meters],
            "flags": list(st["flags"]), "prepared": st.get("prepared", []), "round": st["round"], "total_rounds": len(sc.rounds), "status": st["status"]}
    if st["status"] == "completed":
        end = next(e for e in sc.endings if e.id == st["ending"])
        return {**base, "ending": {"id": end.id, "title": end.title, "text": end.text, "tone": end.tone}}
    r = current_round(sc, st)
    choices = []
    for c in r.choices:
        ok, why = availability(st, c)
        choices.append({"id": c.id, "label": c.label, "summary": c.summary, "available": ok, "reason": why})
    return {**base, "step": {"id": r.id, "title": r.title, "clock": r.clock, "kind": r.kind, "brief": r.brief, "question": r.question,
                             "facts": list(r.facts), "choices": choices, "part": r.part, "scene": r.scene, "sources": list(r.sources)},
            "events": st.get("round_events", [])}


# ---------------------------------------------------------------------------------------------- report

def _level(pct: int) -> str:
    return "Strong" if pct >= 75 else "Solid" if pct >= 50 else "Developing"


def build_report(sc: Scenario, st: dict[str, Any], from_other: dict[str, str] | None = None) -> dict[str, Any]:
    """Everything here is computed from the recorded decisions and events of the run."""
    end = next(e for e in sc.endings if e.id == st["ending"])
    decisions = st["decisions"]
    skills = []
    for sid, label in SKILLS.items():
        cells = [(r, [c.skills.get(sid, 0) for c in r.choices]) for r in sc.rounds if any(sid in c.skills for c in r.choices)]
        if not cells:
            continue
        lo = sum(min(v) for _, v in cells); hi = sum(max(v) for _, v in cells)
        counted = {r.id for r, _ in cells}
        got = sum(d["skills"].get(sid, 0) for d in decisions if d["round"] in counted)
        pct = 100 if hi == lo else round(100 * (got - lo) / (hi - lo))
        evid = [{"step": d["title"], "choice": d["label"], "points": d["skills"][sid]} for d in decisions if sid in d["skills"]]
        up = [e for e in evid if e["points"] > 0]; down = [e for e in evid if e["points"] < 0]
        why = (f"Strongest evidence: “{max(evid, key=lambda e: e['points'])['choice']}” in “{max(evid, key=lambda e: e['points'])['step']}”. " if up else "")
        why += (f"Held back by “{min(evid, key=lambda e: e['points'])['choice']}” in “{min(evid, key=lambda e: e['points'])['step']}”." if down else "")
        skills.append({"id": sid, "label": label, "percent": pct, "level": _level(pct), "decisions_counted": len(cells),
                       "evidence": evid, "explanation": why.strip() or "Every decision that tested this skill was handled well."})
    weak = [d for d in decisions if d["rating"] == "weak"]
    mixed = [d for d in decisions if d["rating"] == "mixed"]
    strong = [d for d in decisions if d["rating"] == "strong"]
    improve = []
    for d in weak + mixed:
        rnd = next(r for r in sc.rounds if r.id == d["round"])
        best = next((c for c in rnd.choices if c.rating == "strong"), None)
        improve.append({"step": d["title"], "chose": d["label"], "why": d["lesson"] or d["consequence"],
                        "stronger_option": best.label if best else None, "rating": d["rating"]})
    weakest = sorted(skills, key=lambda s: s["percent"])[:2]
    return {
        "simulation": sc.title, "simulation_id": sc.id, "role": sc.role,
        "outcome": {"id": end.id, "title": end.title, "text": end.text, "tone": end.tone},
        "final_meters": [{"label": m.label, "value": st["meters"][m.id], "good": m.good} for m in sc.meters],
        "summary": {"decisions": len(decisions), "strong": len(strong), "mixed": len(mixed), "weak": len(weak)},
        "major_decisions": [{"step": d["title"], "part": d["part"], "chose": d["label"], "rating": d["rating"], "consequence": d["consequence"],
                             "changes": d["changes"]} for d in decisions],
        "challenges": [{"title": e["title"], "text": e["text"], "round": e["round"]} for e in st["events"]],
        "skills": skills,
        "improve": improve,
        "focus_areas": [f"{s['label']} ({s['percent']}%): {s['explanation']}" for s in weakest if s["percent"] < 100],
        "lessons": list(sc.lessons),
        "sources": [{"label": a, "url": b} for a, b in sc.sources],
        "recommended_next": from_other or {},
        "note": "These results describe your choices in this simulation only. They are not a judgement of your suitability for any profession.",
    }
