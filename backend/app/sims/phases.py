"""Workday -> interval -> crisis, student reflections, and Career Comparison. Mixed into SimsService."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import Report, Run
from ..engine.prep import ITEMS as BLACKOUT_PREP
from ..services.simulations import NotFound
from .careers import CAREERS, DIMENSIONS, SKILL_LABELS
from .models import CareerChoice, Reflection, SimRun
from .registry import PROFESSIONS, SCENARIOS
from .workdays import WORKDAYS

MINUS = "−"


def _fmt(label: str, v: float) -> str:
    sign = "+" if v > 0 else MINUS
    return f"{label} {sign}{abs(v):g}"


def quality(strong: int, mixed: int, weak: int) -> int | None:
    """Share of the best possible decision quality, 0 to 100: a strong decision counts 2, a mixed one 1, a weak one 0."""
    n = strong + mixed + weak
    return round(100 * (2 * strong + mixed) / (2 * n)) if n else None


def refl_view(r: Reflection) -> dict[str, Any]:
    return {"run_id": r.run_id, "profession": r.profession, "phase": r.phase, "enjoyment": r.enjoyment, "stress": r.stress,
            "daily_interest": r.daily_interest, "note": r.note}


class PhasesMixin:
    # ------------------------------------------------------------------ workday -> crisis
    def _done_workday(self, db: Session, profession: str) -> SimRun | None:
        return db.scalars(select(SimRun).where(SimRun.sim_id == f"{profession}_workday", SimRun.status == "completed").order_by(SimRun.completed_at.desc())).first()

    def _prep_flags(self, db: Session, profession: str) -> list[str]:
        r = self._done_workday(db, profession)
        return [f for f in r.state["flags"] if f.startswith("prep_")] if r else []

    def latest_prep(self, profession: str) -> list[str]:
        """The `prep_*` flags earned in the most recent completed workday."""
        with self.sf() as db:
            return self._prep_flags(db, profession)

    def prep_items(self, profession: str, flags: list[str]) -> list[dict[str, Any]]:
        have = set(flags)
        out: list[dict[str, Any]] = []
        if profession == "blackout":
            for it in BLACKOUT_PREP:
                full = it.flag in have
                part = bool(it.part_flag) and it.part_flag in have
                out.append({"flag": it.flag, "label": it.label, "task": it.task, "status": "full" if full else "part" if part else "missed",
                            "text": it.earned if (full or part) else it.missed,
                            "effects": list(it.shows) if full else [f"half of: {x}" for x in it.shows] if part else []})
            return out
        sc = SCENARIOS[profession]
        labels = {m.id: m.label for m in sc.meters}
        for it in sc.prep:
            full = it.flag in have
            part = bool(it.part_flag) and it.part_flag in have
            eff = it.effects if full else {k: v // 2 for k, v in it.effects.items()} if part else {}
            out.append({"flag": it.flag, "label": it.label, "task": it.task, "status": "full" if full else "part" if part else "missed",
                        "text": it.earned if (full or part) else it.missed, "effects": [_fmt(labels[k], v) for k, v in eff.items() if v]})
        return out

    def prep_summary(self, profession: str) -> dict[str, Any]:
        """What the latest workday set up: shown on the crisis intro and the path page. Empty if no workday has been finished."""
        with self.sf() as db:
            wd = self._done_workday(db, profession)
            items = self.prep_items(profession, [f for f in wd.state["flags"] if f.startswith("prep_")] if wd else [])
            return {"workday_done": wd is not None, "items": items, "earned": sum(1 for i in items if i["status"] != "missed"), "total": len(items)}

    # ------------------------------------------------------------------ reflections
    def save_reflection(self, run_id: str, enjoyment: int, stress: int, daily_interest: int, note: str) -> dict[str, Any]:
        with self.sf() as db:
            run = db.get(SimRun, run_id)
            if run is not None:
                sc = SCENARIOS[run.sim_id]
                profession, phase = sc.profession, sc.kind
            elif db.get(Run, run_id) is not None:
                profession, phase = "blackout", "crisis"
            else:
                raise NotFound("That run does not exist.")
            row = db.get(Reflection, run_id) or Reflection(run_id=run_id, profession=profession, phase=phase, enjoyment=0, stress=0, daily_interest=0)
            row.enjoyment, row.stress, row.daily_interest, row.note = enjoyment, stress, daily_interest, note.strip()[:400]
            db.add(row)
            db.commit()
            return refl_view(row)

    def get_reflection(self, run_id: str) -> dict[str, Any] | None:
        with self.sf() as db:
            row = db.get(Reflection, run_id)
            return refl_view(row) if row else None

    # ------------------------------------------------------------------ career comparison
    def careers(self) -> dict[str, Any]:
        out = []
        with self.sf() as db:
            for cid in PROFESSIONS:
                static = CAREERS[cid]
                wd = self._done_workday(db, cid)
                crisis_run = None if cid == "blackout" else db.scalars(select(SimRun).where(SimRun.sim_id == cid, SimRun.status == "completed").order_by(SimRun.completed_at.desc())).first()
                phases: dict[str, Any] = {"workday": None, "crisis": None}
                skill_pts: dict[str, list[int]] = {}
                for phase, run in (("workday", wd), ("crisis", crisis_run)):
                    if run is None or run.report is None:
                        continue
                    rep = run.report
                    refl = db.get(Reflection, run.id)
                    phases[phase] = {"run_id": run.id, "outcome": rep["outcome"]["title"], "decisions": rep["summary"]["decisions"], "strong": rep["summary"]["strong"],
                                     "mixed": rep["summary"]["mixed"], "weak": rep["summary"]["weak"], "best": rep["summary"].get("best", rep["summary"]["strong"]),
                                     "reflection": refl_view(refl) if refl else None}
                    for sk in rep["skills"]:
                        skill_pts.setdefault(sk["id"], []).append(sk["percent"])
                if cid == "blackout":
                    r = db.scalars(select(Run).where(Run.status == "completed").order_by(Run.updated_at.desc())).first()
                    if r is not None:
                        rep = db.scalars(select(Report).where(Report.run_id == r.id)).first()
                        refl = db.get(Reflection, r.id)
                        q = (rep.report or {}).get("quality", {}) if rep else {}
                        phases["crisis"] = {"run_id": r.id, "outcome": r.state.get("final", {}).get("ending_title") or (r.ending or "Completed"), "decisions": len(r.state.get("decisions", [])),
                                            "strong": q.get("sound", 0), "mixed": q.get("questionable", 0), "weak": q.get("poor", 0), "score": rep.score if rep else None,
                                            "reflection": refl_view(refl) if refl else None}
                for ph in phases.values():
                    if ph:
                        best = ph.get("best", ph["strong"])            # the best option on offer counts in full, even in a dilemma round where it is only rated "mixed"
                        ph["quality"] = quality(best, ph["decisions"] - ph["weak"] - best, ph["weak"])
                skills = {k: round(sum(v) / len(v)) for k, v in skill_pts.items()}
                complete = phases["workday"] is not None and phases["crisis"] is not None
                out.append({"id": cid, **{k: static[k] for k in ("title", "field", "setting", "tagline", "daily", "problems", "decisions", "pressure", "communication", "rewards", "costs")},
                            "skills_required": static["skills"], "you": {"phases": phases, "skills": skills, "complete": complete}})
        return {"careers": out, "skills": SKILL_LABELS, "dimensions": [{"id": i, "label": label} for i, label in DIMENSIONS],
                "choice": self.get_choice(),
                "note": "This compares how you did and felt in each simulated job. It is not career advice, and it does not say what you are suited to: the choice is yours."}

    # ------------------------------------------------------------------ the student's own choice
    def get_choice(self) -> dict[str, Any] | None:
        with self.sf() as db:
            c = db.get(CareerChoice, 1)
            return {"career": c.career, "reason": c.reason, "updated_at": c.updated_at.isoformat()} if c and c.career else None

    def save_choice(self, career: str, reason: str) -> dict[str, Any] | None:
        if career and career not in PROFESSIONS:
            raise NotFound(f"No career called '{career}'.")
        with self.sf() as db:
            c = db.get(CareerChoice, 1) or CareerChoice(id=1)
            c.career, c.reason = career, reason.strip()[:600]
            db.add(c)
            db.commit()
        return self.get_choice()
