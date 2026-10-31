"""Runs, progress, reports and the local profile for the generic simulations, plus the library that also reports BLACKOUT's progress."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from ..db.models import Report, Run, Simulation
from ..services.simulations import BadRequest, Conflict, NotFound
from . import engine as E
from .bhopal import BHOPAL
from .covid import COVID
from .models import Profile, SimRun
from ..db.models import utcnow

SCENARIOS = {"bhopal": BHOPAL, "covid": COVID}
BLACKOUT_META = {
    "id": "blackout", "title": "BLACKOUT: The NotPetya Incident", "tagline": "Lead a terminal through the first ten days of a cyberattack.",
    "role": "Recovery lead at a container terminal", "domain": "Operations · Cybersecurity · Crisis leadership", "minutes": 35,
    "description": "Ten rounds based on the documented 2017 NotPetya attack on Maersk, with reconstructed scenes and simulated decisions, told as a comic.",
    "objectives": ["Decide under pressure with incomplete, changing information.", "Balance safety, customers, evidence and speed.",
                   "Communicate honestly with staff, customers and the public."],
    "style": "comic",
}
ORDER = ("blackout", "bhopal", "covid")
PROFILE_ID = 1


def _meta(sc: E.Scenario) -> dict[str, Any]:
    return {"id": sc.id, "title": sc.title, "tagline": sc.tagline, "role": sc.role, "domain": sc.domain, "minutes": sc.minutes,
            "description": sc.description, "objectives": list(sc.objectives), "style": sc.id}


class SimsService:
    def __init__(self, sf: sessionmaker):
        self.sf = sf

    # ------------------------------------------------------------------ profile
    def profile(self) -> dict[str, Any]:
        with self.sf() as db:
            p = db.get(Profile, PROFILE_ID)
            if p is None:
                p = Profile(id=PROFILE_ID); db.add(p); db.commit()
            return {"name": p.name, "large_text": p.large_text, "reduce_motion": p.reduce_motion}

    def update_profile(self, name: str | None, large_text: bool | None, reduce_motion: bool | None) -> dict[str, Any]:
        with self.sf() as db:
            p = db.get(Profile, PROFILE_ID) or Profile(id=PROFILE_ID)
            if name is not None: p.name = name.strip()[:60]
            if large_text is not None: p.large_text = large_text
            if reduce_motion is not None: p.reduce_motion = reduce_motion
            db.add(p); db.commit()
        return self.profile()

    # ------------------------------------------------------------------ BLACKOUT progress (read-only view of its own tables)
    def _blackout(self, db: Session) -> dict[str, Any]:
        sims = db.scalars(select(Simulation).order_by(Simulation.created_at.desc())).all()
        done = db.scalars(select(Run).where(Run.status == "completed").order_by(Run.updated_at.desc())).all()
        active = next((s for s in sims if (r := db.get(Run, s.active_run_id)) is not None and r.status in ("active", "dead_end")), None)
        info: dict[str, Any] = {"status": "completed" if done else "none", "completed": len(done)}
        if active:
            r = db.get(Run, active.active_run_id)
            info.update(status="active", progress=f"Round {r.state['round']} of 10", percent=round(100 * (r.state["round"] - 1) / 10))
        elif done:
            info.update(progress="Completed", percent=100, ending=done[0].ending)
        return info

    def blackout_current(self) -> dict[str, Any]:
        """The BLACKOUT simulation with an unfinished run, so the desktop app can resume it without relying on browser storage."""
        with self.sf() as db:
            for sim in db.scalars(select(Simulation).order_by(Simulation.created_at.desc())).all():
                run = db.get(Run, sim.active_run_id) if sim.active_run_id else None
                if run is not None and run.status in ("active", "dead_end"):
                    return {"simulation_id": sim.id}
        return {"simulation_id": None}

    def _latest_generic(self, db: Session, sim_id: str) -> SimRun | None:
        return db.scalars(select(SimRun).where(SimRun.sim_id == sim_id, SimRun.status == "active").order_by(SimRun.created_at.desc())).first()

    def library(self) -> list[dict[str, Any]]:
        out = []
        with self.sf() as db:
            for sid in ORDER:
                if sid == "blackout":
                    m = {**BLACKOUT_META, **self._blackout(db)}
                else:
                    sc = SCENARIOS[sid]; m = _meta(sc)
                    act = self._latest_generic(db, sid)
                    done = db.scalars(select(SimRun).where(SimRun.sim_id == sid, SimRun.status == "completed").order_by(SimRun.completed_at.desc())).all()
                    m.update(status="none", completed=len(done), disclaimer=sc.disclaimer)
                    if act:
                        n = act.state["round"]; m.update(status="active", run_id=act.id, progress=f"Step {n} of {len(sc.rounds)}",
                                                         percent=round(100 * (n - 1) / len(sc.rounds)))
                    elif done:
                        m.update(status="completed", run_id=done[0].id, progress="Completed", percent=100, ending=done[0].ending)
                out.append(m)
        return out

    # ------------------------------------------------------------------ runs
    def _scenario(self, sim_id: str) -> E.Scenario:
        if sim_id not in SCENARIOS:
            raise NotFound(f"No simulation called '{sim_id}'.")
        return SCENARIOS[sim_id]

    def _view(self, run: SimRun) -> dict[str, Any]:
        sc = SCENARIOS[run.sim_id]
        return {"run": {"id": run.id, "sim_id": run.sim_id, "status": run.status, "attempt": run.attempt},
                "scenario": {"id": sc.id, "title": sc.title, "role": sc.role, "disclaimer": sc.disclaimer},
                "scene": E.scene_view(sc, run.state),
                "decisions": [{k: d[k] for k in ("n", "title", "label", "rating", "consequence")} for d in run.state["decisions"]]}

    def intro(self, sim_id: str) -> dict[str, Any]:
        sc = self._scenario(sim_id)
        return {**_meta(sc), "intro": list(sc.intro), "disclaimer": sc.disclaimer, "rounds": len(sc.rounds),
                "parts": sorted({r.part for r in sc.rounds if r.part}, key=lambda p: [r.part for r in sc.rounds].index(p))}

    def start(self, sim_id: str) -> dict[str, Any]:
        sc = self._scenario(sim_id)
        with self.sf() as db:
            attempt = len(db.scalars(select(SimRun.id).where(SimRun.sim_id == sim_id)).all()) + 1
            for r in db.scalars(select(SimRun).where(SimRun.sim_id == sim_id, SimRun.status == "active")).all():
                r.status = "abandoned"
            run = SimRun(id=uuid.uuid4().hex[:12], sim_id=sim_id, attempt=attempt, state=E.new_state(sc))
            db.add(run); db.commit()
            return self._view(run)

    def current(self, sim_id: str) -> dict[str, Any] | None:
        self._scenario(sim_id)
        with self.sf() as db:
            run = self._latest_generic(db, sim_id)
            return self._view(run) if run is not None else None

    def _run(self, db: Session, run_id: str) -> SimRun:
        run = db.get(SimRun, run_id)
        if run is None:
            raise NotFound("That run does not exist.")
        return run

    def view(self, run_id: str) -> dict[str, Any]:
        with self.sf() as db:
            return self._view(self._run(db, run_id))

    def decide(self, run_id: str, choice_id: str) -> dict[str, Any]:
        with self.sf() as db:
            run = self._run(db, run_id)
            sc = SCENARIOS[run.sim_id]
            if run.status != "active":
                raise Conflict("This run has already finished.")
            try:
                new, outcome = E.decide(sc, run.state, choice_id)
            except E.Finished as e:
                raise Conflict(str(e))
            except E.InvalidChoice as e:
                raise BadRequest(str(e))
            run.state = new
            if new["status"] == "completed":
                run.status, run.ending, run.completed_at = "completed", new["ending"], utcnow()
                run.report = E.build_report(sc, new, self._next(db, sc))
                run.report["run_id"] = run.id
                run.report["completed_at"] = run.completed_at.isoformat()
            db.add(run); db.commit()
            return {"outcome": outcome, "view": self._view(run)}

    def _next(self, db: Session, sc: E.Scenario) -> dict[str, str]:
        done = {r.sim_id for r in db.scalars(select(SimRun).where(SimRun.status == "completed")).all()}
        if db.scalars(select(Run.id).where(Run.status == "completed")).first():
            done.add("blackout")
        titles = {"blackout": BLACKOUT_META["title"], **{k: v.title for k, v in SCENARIOS.items()}}
        why = {"blackout": "Practise leading through a crisis where facts arrive slowly and every action has a price.",
               "bhopal": "Study how safeguards, cost pressure and warnings add up in industrial safety.",
               "covid": "Experience the pressure of prioritising, communicating and caring for staff in a hospital surge."}
        for nxt in sc.next_up:
            if nxt not in done:
                return {"id": nxt, "title": titles[nxt], "reason": why[nxt]}
        return {"id": sc.id, "title": sc.title, "reason": "You have completed every simulation. Replay this one and try the options you did not choose."}

    def report(self, run_id: str) -> dict[str, Any]:
        with self.sf() as db:
            run = self._run(db, run_id)
            if run.report is None:
                raise Conflict("The report is available once the simulation is finished.")
            return run.report

    # ------------------------------------------------------------------ journey
    def journey(self) -> dict[str, Any]:
        with self.sf() as db:
            runs = db.scalars(select(SimRun).where(SimRun.status == "completed").order_by(SimRun.completed_at.desc())).all()
            done = [{"kind": "report", "run_id": r.id, "sim_id": r.sim_id, "title": SCENARIOS[r.sim_id].title, "attempt": r.attempt,
                     "outcome": r.report["outcome"]["title"], "tone": r.report["outcome"]["tone"],
                     "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                     "decisions": r.report["summary"]["decisions"], "strong": r.report["summary"]["strong"]} for r in runs]
            bo = db.scalars(select(Run).where(Run.status == "completed").order_by(Run.updated_at.desc())).all()
            for r in bo:
                rep = db.scalars(select(Report).where(Report.run_id == r.id)).first()
                done.append({"kind": "blackout", "run_id": r.id, "sim_id": "blackout", "title": BLACKOUT_META["title"], "attempt": r.attempt,
                             "outcome": r.state.get("final", {}).get("ending_title") or (r.ending or "Completed"), "tone": "neutral",
                             "completed_at": r.updated_at.isoformat(), "decisions": len(r.state.get("decisions", [])),
                             "score": rep.score if rep else None})
            skills: dict[str, list[int]] = {}
            for r in runs:
                for s in r.report["skills"]:
                    skills.setdefault(s["label"], []).append(s["percent"])
        return {"completed": done, "skills": [{"label": k, "percent": round(sum(v) / len(v)), "runs": len(v)} for k, v in skills.items()]}
