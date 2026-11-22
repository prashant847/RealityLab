"""Certificates: one per simulation, earned by making the best available choice at every step. Nothing is stored: they are read from the finished runs.

A career simulation (BLACKOUT, Bhopal, the hospital) is two parts, a normal day and a crisis, and both must have been played with every decision at its best.
A technical lab (the circuit, the operation) has one part: every step correct. "Best" is the same measure the reports use: no stronger option was on offer
(in a dilemma with no strong option, the best available one counts). BLACKOUT's crisis uses its own rating, where every decision must be rated sound."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import Checkpoint, Report, Run
from ..engine.state import WorldState
from ..scoring.report import build_report
from .models import SimRun
from .registry import ALL, BLACKOUT_META

ORDER = ("blackout", "bhopal", "covid", "circuit", "surgery")


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


class CertsMixin:
    def _best_generic(self, db: Session, sim_id: str) -> SimRun | None:
        """The earliest finished run of this scenario in which no decision had a stronger option."""
        for r in db.scalars(select(SimRun).where(SimRun.sim_id == sim_id, SimRun.status == "completed").order_by(SimRun.completed_at)).all():
            md = (r.report or {}).get("major_decisions") or []
            if md and all(d.get("stronger_option") is None for d in md) and (r.ending == "success" or sim_id not in ("circuit", "surgery")):
                return r
        return None

    def _best_blackout(self, db: Session) -> Run | None:
        for run in db.scalars(select(Run).where(Run.status == "completed").order_by(Run.updated_at)).all():
            row = db.scalars(select(Report).where(Report.run_id == run.id)).first()
            rep = row.report if row else None
            if not rep or "quality" not in rep:                      # a finished run whose report was never opened: build it once and keep it
                cps = list(db.scalars(select(Checkpoint).where(Checkpoint.run_id == run.id).order_by(Checkpoint.idx)))
                rep = build_report(run.id, [WorldState.model_validate(c.state) for c in cps], WorldState.model_validate(run.state))
                if row: row.report, row.score = rep, rep["overall"]["score"]
                else: db.add(Report(run_id=run.id, report=rep, score=rep["overall"]["score"]))
                db.commit()
            n = rep.get("decision_count", 0)
            if n and rep["quality"]["sound"] == n:
                return run
        return None

    def certificates(self) -> list[dict[str, Any]]:
        out = []
        with self.sf() as db:
            for sid in ORDER:
                if sid in ("circuit", "surgery"):
                    sc = ALL[sid]; title = sc.title
                    run = self._best_generic(db, sid)
                    parts = [{"label": "Every step correct", "met": run is not None, "run_id": run.id if run else None,
                              "to": f"#/lab/{sid}", "at": _iso(run.completed_at) if run else None}]
                else:
                    title = BLACKOUT_META["title"] if sid == "blackout" else ALL[sid].title
                    wd = self._best_generic(db, f"{sid}_workday")
                    cr = self._best_blackout(db) if sid == "blackout" else self._best_generic(db, sid)
                    parts = [{"label": "A normal day: the best choice at every step", "met": wd is not None, "run_id": wd.id if wd else None, "to": f"#/workday/{sid}",
                              "at": _iso(wd.completed_at) if wd else None},
                             {"label": "The crisis: the best choice at every step", "met": cr is not None, "run_id": cr.id if cr else None,
                              "to": "#/play/blackout" if sid == "blackout" else f"#/crisis/{sid}",
                              "at": (_iso(cr.completed_at) if sid != "blackout" else _iso(cr.updated_at)) if cr else None}]
                earned = all(p["met"] for p in parts)
                when = max(p["at"] for p in parts) if earned else None
                last = next((p["run_id"] for p in reversed(parts) if p["run_id"]), None)
                out.append({"id": sid, "title": title, "earned": earned, "earned_at": when, "parts": parts,
                            "number": f"RL-{sid[:3].upper()}-{(last or '')[:6].upper()}" if earned else None, "run_ids": [p["run_id"] for p in parts if p["run_id"]]})
        return out
