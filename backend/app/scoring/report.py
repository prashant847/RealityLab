"""Builds the final performance report and run-to-run comparisons from recorded data only.

Nothing here is generated prose about the player: every sentence is a template filled from
recorded decisions, events, checkpoint states and planner results.
"""
from __future__ import annotations

from typing import Any

from ..engine.engine import describe_deltas, preview
from ..engine.state import WorldState
from ..scenario.events import EVENTS
from ..scenario.rounds import ROUNDS
from . import ratings as R
from . import rubric

_EVENTS = {e.id: e for e in EVENTS}
LOSS_FIELDS = {"staff_safety": ("points of staff safety", "safety"), "window_min": ("minutes of time slack", "time"),
               "evidence_quality": ("points of evidence quality", "evidence"), "system_integrity": ("points of system integrity", "systems"),
               "public_trust": ("points of public trust", "trust"), "budget": ("lakh of budget", "money"),
               "transport_capacity": ("units of transport capacity", "capacity"),
               "true_units": ("units of stock written off", "stock")}
FOCUS = {
    "safety": "Follow emergency procedure first: evacuate or have an authorized person assess before operating near a hazard.",
    "inventory": "Verify stock physically and protect the evidence trail early; unverified records cost you later.",
    "finance": "Stage spending and keep a reserve for the round-6 to round-8 contingencies; avoid deferred obligations you cannot meet.",
    "recovery": "Contain before restoring, then invest in the repairs that actually restore system integrity.",
    "delivery": "Work backwards from the hospitals' need: confirm enough verified stock and enough transport capacity before the last hour.",
    "coordination": "Listen to the advisor whose priorities your decision affects most; trust falls when their warnings are ignored.",
    "communication": "Say what is known, what is not, and when you will update; silence and public disagreement both cost trust.",
    "adaptability": "After a setback, re-check the options rather than continuing the plan unchanged.",
}


def _idx(states: list[WorldState], i: int, final: WorldState) -> WorldState:
    return states[i + 1] if i + 1 < len(states) else final


def _signed(v: float) -> str:
    return f"{'+' if v > 0 else '−'}{abs(round(v, 1)):g}"


# ------------------------------------------------------------------ decision analysis
def analyse_decisions(checkpoints: list[WorldState], final: WorldState) -> list[dict[str, Any]]:
    out = []
    for i, d in enumerate(final.decisions):
        cp = checkpoints[i]
        r = R.rate_decision(cp, d["choice_id"])
        nxt = _idx(checkpoints, i, final)
        before, after = rubric.category_scores(cp), rubric.category_scores(nxt)
        delta = {k: round(after[k] - before[k], 1) for k in before}
        impact = round(rubric.weighted(after) - rubric.weighted(before), 2)
        recovery_gain = round((0.5 * nxt.system_integrity + 0.3 * nxt.recovery_progress)
                              - (0.5 * cp.system_integrity + 0.3 * cp.recovery_progress), 1)
        alt = None
        chosen_c = r["_chosen_choice"]
        alt_c, by = None, []
        if r["rating"] != "sound":
            alt_c = r["_best_choice"]                              # clearly better feasibility
        elif r["warned_by"] and impact < 0:                       # sound, but warned against and it cost points:
            for w in r["warned_by"]:                              # the alternative the warning advisor recommended
                rid = r["advisor_recs"].get(w["stakeholder"])
                if rid and rid != chosen_c.id:
                    alt_c = next(c for c in ROUNDS[cp.round].choices if c.id == rid)
                    by = [s.title() for s, v in r["advisor_recs"].items() if v == rid]
                    break
        if alt_c is not None and alt_c.id != chosen_c.id:
            diffs = R.alternative_preview(cp, chosen_c, alt_c)
            p_alt = next(o["p_objective"] for o in r["options"] if o["choice_id"] == alt_c.id)
            alt = {"choice_id": alt_c.id, "label": alt_c.label, "recommended_by": by, "p_objective": p_alt,
                   "differences": [f"{k.replace('_', ' ')}: {a:g} → {b:g}" for k, (a, b) in diffs.items()]}
        verdict, outcome = r["verdict"], r["outcome"]
        if r["rating"] == "sound" and r["warned_by"] and impact < 0:
            who = " and ".join(w["stakeholder"].title() for w in r["warned_by"])
            verdict = (f"Feasible, but {who} warned against it with reasons you could see, "
                       f"and it cost {abs(impact):.1f} points of readiness once its consequences landed.")
        out.append({
            "index": i, "round": d["round"], "clock": d["clock"], "choice_id": d["choice_id"], "label": d["label"],
            "rating": r["rating"], "outcome": outcome, "verdict": verdict, "bad_luck": [],
            "p_objective": r["p_objective"], "p_best": r["p_best"], "ev": r["ev"], "best_ev": r["best_ev"],
            "hindsight_regret": r["hindsight_regret"], "warned_by": r["warned_by"],
            "impact": {"score_delta": impact, "by_category": delta, "recovery_gain": recovery_gain},
            "effects": describe_deltas(d["deltas"]), "known_info": d["known_info"], "alternative": alt,
            "_options": r["options"],
        })
    # Bad luck belongs to the decision that created the exposure: the latest decision that made a chance event
    # possible, or (for events nothing could have prevented) the decision just before it fired.
    luck: dict[int, list[dict[str, Any]]] = {i: [] for i in range(len(out))}
    for ev in final.events:
        spec = _EVENTS.get(ev["event_id"])
        if spec is None or spec.probability >= 1.0 or not any("−" in x for x in ev.get("effects", [])):
            continue
        causes = _causes(checkpoints, out, spec, ev["round"])
        owner = causes[-1][0] if causes else next((i for i, d in enumerate(out) if d["round"] == ev["round"] - 1), None)
        if owner is not None:
            luck[owner].append(ev)
    for i, d in enumerate(out):
        d["bad_luck"] = [e["title"] for e in luck[i]]
        if d["rating"] == "sound" and not d["warned_by"] and luck[i]:
            e0 = luck[i][0]
            d["outcome"] = "unlucky"
            d["verdict"] = (f"A reasonable choice that nobody warned against, then chance intervened: {e0['title']} "
                            f"(a {round(100 * _EVENTS[e0['event_id']].probability)}% chance).")
    return out


def _adaptability(final: WorldState, dec: list[dict[str, Any]]) -> tuple[float, str]:
    first_setback = next((e["round"] for e in final.events if any("−" in x for x in e.get("effects", []))), None)
    pool = [d for d in dec if first_setback is None or d["round"] >= first_setback]
    if not pool:
        pool = dec
    score = 100.0 * sum(d["rating"] == "sound" for d in pool) / max(1, len(pool))
    note = ("no setbacks occurred, so all decisions were judged" if first_setback is None
            else f"first setback arrived entering round {first_setback}")
    return score, note


# ------------------------------------------------------------------ losses, opportunities
def _avoiders(cp: WorldState, chosen: dict[str, Any], spec) -> list[str]:
    """Equally sound alternatives at this checkpoint after which the event could not have fired."""
    chosen_c = next(c for c in ROUNDS[cp.round].choices if c.id == chosen["choice_id"])
    if not all(c.test(preview(cp, chosen_c)) for c in spec.conditions):
        return []                                  # this decision did not make the event possible
    out = []
    for o in sorted(chosen["_options"], key=lambda o: -o["ev"]):
        if o["choice_id"] == chosen["choice_id"] or o["ev"] < chosen["ev"] - R.SOUND_MAX_REGRET:
            continue
        alt = next(c for c in ROUNDS[cp.round].choices if c.id == o["choice_id"])
        if not all(c.test(preview(cp, alt)) for c in spec.conditions):
            out.append(o["label"])
    return out


def _causes(checkpoints: list[WorldState], dec: list[dict[str, Any]], spec, event_round: int) -> list[tuple[int, list[str]]]:
    """Decisions (oldest first) that made this event possible and had a comparably sound way to prevent it."""
    out = []
    if spec is not None and spec.conditions:
        for i, d in enumerate(dec):
            if d["round"] < event_round:
                alts = _avoiders(checkpoints[i], d, spec)
                if alts:
                    out.append((i, alts))
    return out


def _losses(checkpoints: list[WorldState], final: WorldState, dec: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Negative consequences that happened TO the run. Each is traced to the LATEST decision at which a
    comparably sound alternative would have made the event impossible (the last point of control);
    an event no earlier decision could have prevented is chance."""
    losses = []
    for ev in final.events:
        spec = _EVENTS.get(ev["event_id"])
        causes = _causes(checkpoints, dec, spec, ev["round"])
        for field, (unit, kind) in LOSS_FIELDS.items():
            d = ev["deltas"].get(field)
            if not d or d[1] >= d[0]:
                continue
            item = {"kind": kind, "amount": round(d[0] - d[1], 2), "unit": unit, "event": ev["title"], "round": ev["round"],
                    "clock": ev["clock"], "probability": spec.probability if spec else 1.0, "caused_by": None, "chance": not causes,
                    "avoidable": bool(causes), "alternative": None, "earlier_chances": []}
            if causes:
                i, alts = causes[-1]
                item["caused_by"] = {"index": i, "label": dec[i]["label"]}
                item["alternative"] = alts[0]
                item["earlier_chances"] = [{"index": j, "label": dec[j]["label"], "alternative": a[0]} for j, a in causes[:-1]]
            losses.append(item)
    if final.final and final.final.get("provisional_shortfall"):
        n = final.final["provisional_shortfall"]
        cause = next((i for i, d in enumerate(final.decisions) if d["choice_id"] == "r10_provisional"), None)
        losses.append({"kind": "phantom_stock", "amount": n, "unit": "units shipped on records that did not exist",
                       "event": "Provisional records overstated stock", "round": 10, "clock": "6:00 AM", "probability": 1.0, "chance": False,
                       "avoidable": True, "alternative": "Dispatch verified stock only, or sweep first", "earlier_chances": [],
                       "caused_by": None if cause is None else {"index": cause, "label": dec[cause]["label"]}})
    return sorted(losses, key=lambda x: (not x["avoidable"], -x["amount"]))


def _opportunities(final: WorldState) -> list[dict[str, Any]]:
    fired = {e["event_id"] for e in final.events}
    out = [{"kind": "event", "text": e.opportunity} for e in EVENTS
           if e.opportunity and e.id not in fired and all(c.test(final) for c in e.opportunity_if)]
    d = final.final or {}
    for who, key, need in (("hospitals", "shipped_hospital", "hospital_need"), ("the contract customer", "shipped_contract", "contract_need")):
        short = d.get(need, 0) - d.get(key, 0)
        if short > 0:
            limit = ("verified stock" if final.verified_units < final.transport_capacity else "transport capacity")
            out.append({"kind": "shortfall", "text": f"{short} units short for {who}; the binding limit was {limit} "
                        f"({final.verified_units} verified units, {final.transport_capacity} units of capacity)."})
    return out


def _reveal(final: WorldState) -> dict[str, Any]:
    return {"recorded_units": final.recorded_units, "true_units": final.true_units,
            "records_overstated_by": final.recorded_units - final.true_units, "verified_units": final.verified_units,
            "existing_but_unverified": max(0, final.true_units - final.verified_units),
            "note": "Revealed only now that the run is over. During play the true stock was never shown."}


# ------------------------------------------------------------------ the report
def build_report(run_id: str, checkpoints: list[WorldState], final: WorldState) -> dict[str, Any]:
    dec = analyse_decisions(checkpoints, final)
    adapt, adapt_note = _adaptability(final, dec)
    dispatch = final.final or {}
    scores = rubric.category_scores(final, dispatch, adapt)
    total, cap_note = rubric.overall(scores, final.ending)
    cats = []
    for c in rubric.CATEGORIES:
        cats.append({"id": c.id, "name": c.name, "weight": c.weight, "score": round(scores[c.id], 1),
                     "weighted": round(c.weight * scores[c.id], 1), "formula": c.formula, "measures": c.measures,
                     "inputs": _inputs(c.id, final, dispatch, adapt_note)})
    losses = _losses(checkpoints, final, dec)
    ranked = sorted(dec, key=lambda d: d["impact"]["score_delta"])
    damaging = [d["index"] for d in ranked if d["impact"]["score_delta"] < 0 or d["rating"] != "sound"][:3]
    strongest = [d["index"] for d in reversed(ranked) if d["rating"] == "sound" and d["impact"]["score_delta"] > 0][:3]
    improvers = [d["index"] for d in sorted(dec, key=lambda d: -d["impact"]["recovery_gain"]) if d["impact"]["recovery_gain"] >= 5][:4]
    weakest = sorted((c for c in cats if c["id"] != "adaptability"), key=lambda c: c["score"])[:2]
    public = [{k: v for k, v in d.items() if k != "_options"} for d in dec]
    return {
        "version": rubric.VERSION, "kind": "final", "run_id": run_id, "decision_count": len(dec),
        "ending": {"id": final.ending, "title": dispatch.get("ending_title"), "text": dispatch.get("ending_text")},
        "overall": {"score": round(total, 1), "band": rubric.band(total), "raw": round(rubric.weighted(scores), 1), "cap": cap_note},
        "categories": cats, "dispatch": dispatch, "decisions": public,
        "strongest_decisions": strongest, "most_damaging_decisions": damaging, "recovery_improvers": improvers,
        "avoidable_losses": [x for x in losses if x["avoidable"]],
        "unavoidable_losses": [x for x in losses if not x["avoidable"]],
        "missed_opportunities": _opportunities(final),
        "recommended_alternatives": [{"index": d["index"], "clock": d["clock"], "chosen": d["label"], **d["alternative"],
                                      "why": d["verdict"]}
                                     for d in sorted((d for d in dec if d["alternative"]),
                                                     key=lambda d: (d["rating"] == "sound", d["impact"]["score_delta"]))[:5]],
        "focus_next": [{"category": c["name"], "score": c["score"], "advice": FOCUS[c["id"]]} for c in weakest if c["score"] < 85],
        "quality": quality_counts(dec), "reveal": _reveal(final),
    }


def _inputs(cid: str, s: WorldState, d: dict[str, Any], adapt_note: str) -> dict[str, Any]:
    flags = set(s.flags)
    return {
        "safety": {"staff_safety": s.staff_safety, "unsafe_operations": "unsafe_ops" in flags},
        "inventory": {"evidence_quality": s.evidence_quality, "verified_units": s.verified_units,
                      "units_needed": s.hospital_need + s.contract_need, "phantom_units_shipped": d.get("provisional_shortfall", 0)},
        "finance": {"budget_left_lakh": s.budget, "invoice_defaulted": "invoice_default" in flags,
                    "penalty_unpaid": "penalty_unpaid" in flags, "committed_most_of_budget_early": "spent_heavy_early" in flags},
        "recovery": {"system_integrity": s.system_integrity, "recovery_progress": s.recovery_progress, "time_slack_min": s.window_min},
        "delivery": {"hospital_shipped": d.get("shipped_hospital"), "hospital_need": s.hospital_need,
                     "contract_shipped": d.get("shipped_contract"), "contract_need": s.contract_need,
                     "deadline_met": d.get("deadline_met"), "hospitals_deprioritized": "hospitals_deprioritized" in flags},
        "coordination": dict(s.trust),
        "communication": {"public_trust": s.public_trust, "factual_statement": "factual_statement" in flags,
                          "coordinated_briefing": "coordinated_briefing" in flags, "silence": "silence" in flags,
                          "leads_disagreed": "leads_disagreed" in flags},
        "adaptability": {"basis": adapt_note},
    }[cid]


def quality_counts(dec: list[dict[str, Any]]) -> dict[str, int]:
    c = {"sound": 0, "questionable": 0, "poor": 0, "unlucky": 0, "lucky": 0}
    for d in dec:
        c[d["rating"]] += 1
        if d["outcome"] in ("unlucky", "lucky"):
            c[d["outcome"]] += 1
    return c


def attempt_quality(checkpoints: list[WorldState], state: WorldState) -> dict[str, Any]:
    """Decision-quality summary for a run that did not finish (dead end / in progress)."""
    dec = analyse_decisions(checkpoints, state) if state.decisions else []
    return {"kind": "attempt", "decision_count": len(dec), "quality": quality_counts(dec)}


# ------------------------------------------------------------------ comparison
GOOD_HIGH = ("hospital_shipped", "contract_shipped", "budget_left", "staff_safety", "system_integrity", "recovery_progress", "verified_share", "evidence_quality",
             "public_trust", "time_left", "delivery_completion", "overall_score")


def run_summary(label: str, run_id: str, status: str, state: WorldState, report: dict[str, Any] | None) -> dict[str, Any]:
    done = status == "completed" and state.final
    f = state.final or {}
    need = state.hospital_need + state.contract_need
    neg_events = [e["title"] for e in state.events if any("−" in x for x in e.get("effects", []))]
    return {
        "run_id": run_id, "label": label, "status": status,
        "ending": (f.get("ending_title") if done else {"dead_end": "Dead end — recovery window closed", "active": "In progress"}.get(status, status)),
        "metrics": {
            "delivery_completion": round(100 * (f["shipped_hospital"] + f["shipped_contract"]) / need, 1) if done else None,
            "hospital_shipped": f.get("shipped_hospital") if done else None, "contract_shipped": f.get("shipped_contract") if done else None,
            "budget_left": state.budget, "staff_safety": state.staff_safety, "system_integrity": state.system_integrity,
            "recovery_progress": state.recovery_progress, "verified_share": round(min(100.0, 100 * state.verified_units / need), 1),
            "evidence_quality": state.evidence_quality, "public_trust": state.public_trust, "time_left": state.window_min,
            "overall_score": report["overall"]["score"] if report else None,
        },
        "critical_events": neg_events, "injuries": "staff_injured" in state.flags,
        "decisions": len(state.decisions), "round": state.round,
    }


def compare_runs(a: dict[str, Any], b: dict[str, Any], a_states: list[WorldState], a_state: WorldState,
                 b_states: list[WorldState], b_state: WorldState, same_seed: bool) -> dict[str, Any]:
    rows = []
    for k, va in a["metrics"].items():
        vb = b["metrics"][k]
        if va is None or vb is None:
            rows.append({"metric": k, "base": va, "other": vb, "delta": None, "favours": None})
            continue
        delta = round(vb - va, 2)
        favours = "same" if delta == 0 else ("other" if (delta > 0) == (k in GOOD_HIGH) else "base")
        rows.append({"metric": k, "base": va, "other": vb, "delta": delta, "favours": favours})
    ad, bd = a_state.decisions, b_state.decisions
    n = max(len(ad), len(bd))
    first_diff = next((i for i in range(n) if i >= len(ad) or i >= len(bd) or ad[i]["choice_id"] != bd[i]["choice_id"]), None)

    def step(states, final, i):
        if i >= len(final.decisions):
            return None
        d = final.decisions[i]
        evs = [e["title"] for e in final.events if e["round"] == d["round"]]            # events that fired entering this round
        nxt = states[i + 1] if i + 1 < len(states) else final
        return {"round": d["round"], "clock": d["clock"], "choice_id": d["choice_id"], "label": d["label"],
                "events_before": evs, "readiness_after": round(rubric.snapshot_score(nxt), 1)}
    timeline = [{"index": i, "base": step(a_states, a_state, i), "other": step(b_states, b_state, i),
                 "diverged": first_diff is not None and i >= first_diff,
                 "same_choice": i < len(ad) and i < len(bd) and ad[i]["choice_id"] == bd[i]["choice_id"]} for i in range(n)]
    return {
        "base": a, "other": b, "same_seed": same_seed, "first_difference": first_diff, "metrics": rows, "timeline": timeline,
        "note": ("Both runs use the same seed and start from identical conditions up to the first difference. Chance events are "
                 "re-rolled for each round and situation, so a different choice can also change which chance events occur."),
        "favours_count": {w: sum(1 for r in rows if r["favours"] == w) for w in ("base", "other", "same")},
    }
