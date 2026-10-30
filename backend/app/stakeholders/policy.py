"""Turns an Agent + the current state into structured, deterministic advice."""
from __future__ import annotations

from typing import Any

from ..engine.engine import availability, preview
from ..engine.rules import read
from ..engine.state import WorldState
from ..scenario.rounds import ROUNDS
from .agents import AGENTS, COMMON_VETOES, Agent

SPREAD_FLOOR = 2.0       # below this spread the agent has no real preference
SUPPORT_BAND = 0.2       # within 20% of the spread of the best => supports
OPPOSE_BAND = 0.7        # more than 70% of the spread below the best => opposes


def _utility(agent: Agent, before: WorldState, after: WorldState) -> tuple[float, list[tuple[str, float]]]:
    parts: list[tuple[str, float]] = []
    for key, w in agent.weights.items():
        d = (read(after, key) - read(before, key)) * w
        if abs(d) > 1e-9:
            parts.append((key, d))
    for f in set(after.flags) - set(before.flags):
        if f in agent.flags:
            parts.append((f, agent.flags[f]))
    for key, v in agent.values.items():
        field_, val = key.split("=")
        if str(read(after, field_)) == val and str(read(before, field_)) != val:
            parts.append((key, v))
    return sum(p[1] for p in parts), parts


def _phrase(agent: Agent, key: str, positive: bool) -> str | None:
    pair = agent.phrases.get(key)
    if not pair:
        return None
    return pair[0 if positive else 1] or None


def _reasons(agent: Agent, parts: list[tuple[str, float]], positive: bool, limit: int = 2) -> list[str]:
    ranked = sorted((p for p in parts if (p[1] > 0) == positive and abs(p[1]) >= 1.0), key=lambda p: -abs(p[1]))
    out: list[str] = []
    for key, _ in ranked:
        ph = _phrase(agent, key, positive)
        if ph and ph not in out:
            out.append(ph)
        if len(out) == limit:
            break
    return out


def evaluate(agent: Agent, state: WorldState) -> list[dict[str, Any]]:
    """Per available choice: utility, veto, verdict and reasons from this agent's point of view."""
    rows: list[dict[str, Any]] = []
    for c in ROUNDS[state.round].choices:
        if not availability(state, c)[0]:
            continue
        after = preview(state, c)
        u, parts = _utility(agent, state, after)
        veto = next((r for v in (*COMMON_VETOES, *agent.vetoes) if (r := v(state, after, c))), None)
        rows.append({"choice": c, "u": u, "parts": parts, "veto": veto})
    ok = [r for r in rows if r["veto"] is None]
    spread = (max(r["u"] for r in rows) - min(r["u"] for r in rows)) if rows else 0.0
    best = max((r["u"] for r in ok), default=None)
    for r in rows:
        if r["veto"]:
            r["verdict"], r["reasons"] = "oppose", [r["veto"]]
        elif spread < SPREAD_FLOOR or best is None:
            r["verdict"], r["reasons"] = "neutral", []
        elif r["u"] >= best - SUPPORT_BAND * spread:
            r["verdict"], r["reasons"] = "support", _reasons(agent, r["parts"], True)
        elif r["u"] < best - OPPOSE_BAND * spread:
            r["verdict"], r["reasons"] = "oppose", _reasons(agent, r["parts"], False)
        else:
            r["verdict"], r["reasons"] = "caution", _reasons(agent, r["parts"], False)
    r_best = max(ok, key=lambda r: r["u"]) if ok and spread >= SPREAD_FLOOR else None
    for r in rows:
        r["recommended"] = r is r_best
    r_sorted = sorted(ok, key=lambda r: -r["u"])
    margin = ((r_sorted[0]["u"] - r_sorted[1]["u"]) / max(spread, 1.0)) if len(r_sorted) > 1 else 1.0
    for r in rows:
        r["margin"] = margin
    return rows


def _confidence(agent: Agent, state: WorldState, rows: list[dict[str, Any]]) -> tuple[int, str | None]:
    if not rows or not any(r["recommended"] for r in rows):
        base = 30
    else:
        base = 35 + int(45 * min(1.0, rows[0]["margin"]))
    adj, note = agent.uncertainty(state)
    return max(10, min(95, base + adj)), note


def _reaction(agent: Agent, previous: tuple[WorldState, str] | None) -> dict[str, Any] | None:
    """How this agent judges the player's most recent decision, from the info available then."""
    if previous is None:
        return None
    before, choice_id = previous
    rows = evaluate(agent, before)
    row = next((r for r in rows if r["choice"].id == choice_id), None)
    if row is None:
        return None
    verdict = row["verdict"]
    label = row["choice"].label
    if verdict == "oppose":
        why = row["reasons"][0] if row["reasons"] else "it ran against my priorities"
        return {"verdict": "challenge", "choice_id": choice_id, "label": label, "why": why}
    if verdict == "support":
        return {"verdict": "agree", "choice_id": choice_id, "label": label,
                "why": row["reasons"][0] if row["reasons"] else "it fit my priorities"}
    return {"verdict": "mixed", "choice_id": choice_id, "label": label,
            "why": row["reasons"][0] if row["reasons"] else "I had mixed feelings about it"}


def build_core(agent_id: str, state: WorldState, previous: tuple[WorldState, str] | None = None) -> dict[str, Any]:
    """Structured advice with NO dialogue text yet (dialogue is composed or LLM-phrased afterwards)."""
    agent = AGENTS[agent_id]
    rows = evaluate(agent, state)
    confidence, uncertainty_note = _confidence(agent, state, rows)
    rec = next((r for r in rows if r["recommended"]), None)
    stances = [{"choice_id": r["choice"].id, "label": r["choice"].label, "verdict": r["verdict"],
                "reasons": r["reasons"], "vetoed": r["veto"] is not None} for r in rows]
    cons = next((r for r in sorted(rows, key=lambda r: (r["veto"] is None, r["u"])) if r["verdict"] == "oppose"), None)
    clock = ROUNDS[state.round].clock
    return {
        "stakeholder": agent.id, "name": agent.name, "role": agent.role, "round": state.round, "clock": clock,
        "recommendation": rec["choice"].id if rec else None,
        "recommendation_label": rec["choice"].label if rec else None,
        "recommendation_reasons": rec["reasons"] if rec else [],
        "objection": ({"choice_id": cons["choice"].id, "label": cons["choice"].label,
                       "why": cons["reasons"][0] if cons["reasons"] else "it runs against my priorities"} if cons else None),
        "confidence": confidence, "uncertainty": uncertainty_note,
        "stances": stances,
        "facts": agent.facts(state),
        "private": [{"text": f.text, "reliability": f.reliability, "verified": f.verified} for f in agent.private_info(state)],
        "reaction": _reaction(agent, previous),
    }
