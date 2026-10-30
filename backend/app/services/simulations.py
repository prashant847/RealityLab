"""Application service: orchestrates engine + planner + database. All writes happen inside one
transaction per call (`sessionmaker.begin()`), so a failed decision leaves no partial rows."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from ..db.models import Checkpoint, DecisionRow, EventRow, Report, Run, Simulation, StakeholderInteraction, utcnow
from ..engine import (InvalidDecision, SimulationFinished, apply_decision, new_simulation, player_state,
                      scene_view)
from ..engine import planner
from ..engine.analysis import analyze_dead_end
from ..engine.engine import scene_info
from ..engine.state import WorldState
from ..scenario.events import EVENTS
from ..scenario.risks import active_risks
from ..scoring import rubric
from ..scoring.report import attempt_quality, build_report, compare_runs, run_summary
from ..stakeholders.agents import STAKEHOLDER_IDS
from ..stakeholders.dialogue import compose, compose_reaction
from ..stakeholders.llm import Voice
from ..stakeholders.policy import build_core

DEFAULT_MAX_REWINDS = 5
MAX_RUNS = 30


class ServiceError(Exception):
    status = 400
    code = "error"


class NotFound(ServiceError):
    status, code = 404, "not_found"


class Conflict(ServiceError):
    status, code = 409, "conflict"


class BadRequest(ServiceError):
    status, code = 422, "invalid_request"


def _id() -> str:
    return uuid.uuid4().hex[:12]


def pending_events(state: WorldState) -> list[dict[str, Any]]:
    fired = {e["event_id"] for e in state.events}
    return [{"event_id": e.id, "first_round": e.first_round, "last_round": e.last_round}
            for e in EVENTS if e.id not in fired and e.last_round >= state.round]


def _checkpoint_row(run_id: str, idx: int, state: WorldState) -> Checkpoint:
    scene = scene_view(state)
    return Checkpoint(
        run_id=run_id, idx=idx, round=state.round, clock=scene.get("clock", "About Day 10"), state=state.model_dump(),
        available_actions=[{"id": c["id"], "available": c["available"], "cost": c["cost"]}
                           for c in scene.get("choices", [])],
        active_risks=active_risks(state), event_queue=pending_events(state),
        resources={"budget": state.budget, "window_min": state.window_min,
                   "verified_units": state.verified_units, "transport_capacity": state.transport_capacity},
        seed=state.seed, replay_position=len(state.decisions),
    )


class SimulationService:
    def __init__(self, session_factory: sessionmaker, voice: Voice | None = None):
        self.sf = session_factory
        self.voice = voice or Voice(None)     # default: fully deterministic, no network

    # ------------------------------------------------------------------ lookups
    def _sim(self, db: Session, sim_id: str) -> Simulation:
        sim = db.get(Simulation, sim_id)
        if sim is None:
            raise NotFound(f"Simulation '{sim_id}' does not exist.")
        return sim

    def _run(self, db: Session, sim: Simulation, run_id: str | None = None) -> Run:
        run = db.get(Run, run_id or sim.active_run_id)
        if run is None or run.simulation_id != sim.id:
            raise NotFound("Run not found in this simulation.")
        return run

    def _checkpoints(self, db: Session, run_id: str) -> list[Checkpoint]:
        return list(db.scalars(select(Checkpoint).where(Checkpoint.run_id == run_id).order_by(Checkpoint.idx)))

    # ------------------------------------------------------------------ create / view
    def create(self, seed: int | None = None, max_rewinds: int = DEFAULT_MAX_REWINDS) -> dict[str, Any]:
        with self.sf.begin() as db:
            sim_id, run_id = _id(), _id()
            state = new_simulation(seed, sim_id)
            sim = Simulation(id=sim_id, seed=state.seed, root_run_id=run_id, active_run_id=run_id,
                             max_rewinds=max_rewinds)
            db.add(sim)
            db.flush()
            db.add(Run(id=run_id, simulation_id=sim_id, kind="main", attempt=1, status="active",
                       state=state.model_dump(), classification=_public_class(planner.classify(state))))
            return self._view(db, sim, db.get(Run, run_id))

    def view(self, sim_id: str, run_id: str | None = None) -> dict[str, Any]:
        with self.sf() as db:
            sim = self._sim(db, sim_id)
            return self._view(db, sim, self._run(db, sim, run_id))

    def _view(self, db: Session, sim: Simulation, run: Run) -> dict[str, Any]:
        state = WorldState.model_validate(run.state)
        cps = self._checkpoints(db, run.id)
        return {
            "simulation": {"id": sim.id, "seed": sim.seed, "active_run_id": sim.active_run_id,
                           "rewinds_used": sim.rewinds_used, "max_rewinds": sim.max_rewinds,
                           "rewinds_left": sim.max_rewinds - sim.rewinds_used},
            "run": {"id": run.id, "kind": run.kind, "attempt": run.attempt, "status": run.status,
                    "parent_run_id": run.parent_run_id, "branch_checkpoint_index": run.branch_checkpoint_index,
                    "accepted_risk": run.accepted_risk, "ending": run.ending},
            "state": player_state(state),
            "scene": scene_view(state),
            "risks": active_risks(state),
            "analysis": _public_analysis(run.analysis) if run.status == "dead_end" else None,
            "checkpoints": [{"index": c.idx, "round": c.round, "clock": c.clock,
                             "inherited": c.inherited} for c in cps],
        }

    # ------------------------------------------------------------------ decide
    def decide(self, sim_id: str, choice_id: str) -> dict[str, Any]:
        with self.sf.begin() as db:
            sim = self._sim(db, sim_id)
            run = self._run(db, sim)
            outcome = self._decide_in(db, run, choice_id)
            return {"outcome": outcome, **self._view(db, sim, run)}

    def _decide_in(self, db: Session, run: Run, choice_id: str) -> dict[str, Any]:
        """Apply one decision to `run` inside the caller's transaction."""
        if run.status != "active":
            raise Conflict(f"This run is '{run.status}'; decisions are not accepted. "
                           + ("Rewind, continue anyway, or restart." if run.status == "dead_end" else ""))
        state = WorldState.model_validate(run.state)
        try:
            new_state, outcome = apply_decision(state, choice_id)
        except InvalidDecision as e:
            raise BadRequest(str(e)) from e
        except SimulationFinished as e:
            raise Conflict(str(e)) from e

        idx = len(state.decisions)
        db.add(_checkpoint_row(run.id, idx, state))
        db.add(DecisionRow(run_id=run.id, idx=idx, round=state.round, choice_id=choice_id,
                           record=new_state.decisions[-1], outcome=outcome))
        for k, ev in enumerate(outcome["events"]):
            db.add(EventRow(run_id=run.id, idx=len(state.events) + k, round=ev["round"],
                            event_id=ev["event_id"], record=ev))
        db.flush()

        verdict = planner.classify(new_state)
        run.state = new_state.model_dump()
        run.classification = _public_class(verdict)
        if new_state.status == "completed":
            run.status, run.ending = "completed", new_state.ending
        elif verdict["status"] == "dead_end" and (not run.accepted_risk or verdict.get("severity") == "hard"):
            cps = [WorldState.model_validate(c.state) for c in self._checkpoints(db, run.id)]
            run.analysis = analyze_dead_end(cps, new_state)
            run.status = "dead_end"
        run.updated_at = utcnow()
        db.flush()
        return outcome

    # ------------------------------------------------------------------ dead-end actions
    def continue_anyway(self, sim_id: str) -> dict[str, Any]:
        with self.sf.begin() as db:
            sim = self._sim(db, sim_id)
            run = self._run(db, sim)
            if run.status != "dead_end":
                raise Conflict("Only a paused dead-end run can be continued.")
            if not (run.analysis or {}).get("continue_allowed"):
                raise Conflict("No viable path remains in this run; rewind or restart instead.")
            run.status, run.accepted_risk = "active", True
            run.updated_at = utcnow()
            return self._view(db, sim, run)

    def rewind(self, sim_id: str, checkpoint_index: int | None = None) -> dict[str, Any]:
        """Branch from an earlier checkpoint. Default for a dead-end run: the last recoverable one."""
        with self.sf.begin() as db:
            sim = self._sim(db, sim_id)
            old = self._run(db, sim)
            if sim.rewinds_used >= sim.max_rewinds:
                raise Conflict(f"Rewind limit reached ({sim.max_rewinds}).")
            cps = self._checkpoints(db, old.id)
            if not cps:
                raise Conflict("This run has no decisions to rewind to.")
            if checkpoint_index is None:
                checkpoint_index = (old.analysis or {}).get("last_recoverable_checkpoint") \
                    if old.status == "dead_end" else cps[-1].idx
                if checkpoint_index is None:
                    checkpoint_index = 0
            cp = next((c for c in cps if c.idx == checkpoint_index), None)
            if cp is None:
                raise BadRequest(f"Checkpoint {checkpoint_index} does not exist (valid: 0..{cps[-1].idx}).")
            cp_state = WorldState.model_validate(cp.state)
            if old.status == "dead_end":
                if cp.viable is None:
                    cp.viable = (planner.best_tier(cp_state) or 0) >= planner.OBJECTIVE_TIER
                if not cp.viable:
                    last = (old.analysis or {}).get("last_recoverable_checkpoint")
                    raise Conflict(f"Checkpoint {checkpoint_index} is not recoverable: no valid plan remains "
                                   f"from it. The last recoverable checkpoint is {last}.")

            new, later, prev = self._branch(db, sim, old, cps, cp, "rewind", sim.rewinds_used + 2)
            if old.status == "active":
                old.status = "superseded"
            sim.rewinds_used += 1
            sim.active_run_id = new.id
            db.flush()
            view = self._view(db, sim, new)
            view["rewind_context"] = {
                "from_run_id": old.id, "checkpoint_index": cp.idx, "round": cp.round, "clock": cp.clock,
                "known_at_decision": scene_info(cp_state),
                "risks_at_decision": active_risks(cp_state),
                "previous_choice": prev.record["label"] if prev else None,
                "discovered_later": [{"title": e.record["title"], "round": e.round, "clock": e.record["clock"],
                                      "text": e.record["text"]} for e in later],
                "note": "The facts on the left were known when this decision was made. "
                        "The events below happened afterwards.",
            }
            return view

    def _branch(self, db: Session, sim: Simulation, old: Run, cps: list[Checkpoint], cp: Checkpoint,
                kind: str, attempt: int) -> tuple[Run, list[EventRow], DecisionRow | None]:
        """Create a child run whose state is a copy of checkpoint `cp`. Never modifies `old`."""
        cp_state = WorldState.model_validate(cp.state)
        new = Run(id=_id(), simulation_id=sim.id, parent_run_id=old.id, branch_checkpoint_index=cp.idx,
                  kind=kind, attempt=attempt, status="active",
                  state=cp_state.model_dump(), classification=_public_class(planner.classify(cp_state)))
        db.add(new)
        db.flush()
        # Copy the history that led here so the branch is self-contained.
        for c in cps:
            if c.idx < cp.idx:
                db.add(Checkpoint(run_id=new.id, idx=c.idx, round=c.round, clock=c.clock, state=c.state,
                                  available_actions=c.available_actions, active_risks=c.active_risks,
                                  event_queue=c.event_queue, resources=c.resources, seed=c.seed,
                                  replay_position=c.replay_position, inherited=True, viable=c.viable))
        for d in db.scalars(select(DecisionRow).where(DecisionRow.run_id == old.id, DecisionRow.idx < cp.idx)):
            db.add(DecisionRow(run_id=new.id, idx=d.idx, round=d.round, choice_id=d.choice_id,
                               record=d.record, outcome=d.outcome, inherited=True))
        for e in db.scalars(select(EventRow).where(EventRow.run_id == old.id, EventRow.idx < len(cp_state.events))):
            db.add(EventRow(run_id=new.id, idx=e.idx, round=e.round, event_id=e.event_id, record=e.record,
                            inherited=True))
        later = list(db.scalars(select(EventRow).where(EventRow.run_id == old.id,
                                                       EventRow.idx >= len(cp_state.events)).order_by(EventRow.idx)))
        prev = db.scalars(select(DecisionRow).where(DecisionRow.run_id == old.id, DecisionRow.idx == cp.idx)).first()
        db.flush()
        return new, later, prev

    def replay(self, sim_id: str, checkpoint_index: int, choices: list[str],
               follow_original: bool = False) -> dict[str, Any]:
        """Counterfactual: branch from any checkpoint of the active run, play `choices`, optionally
        keep following the original run's later choices while they remain available. The active
        run is not changed and no rewind is consumed. All-or-nothing."""
        with self.sf.begin() as db:
            sim = self._sim(db, sim_id)
            old = self._run(db, sim)
            n_runs = len(db.scalars(select(Run).where(Run.simulation_id == sim.id)).all())
            if n_runs >= MAX_RUNS:
                raise Conflict(f"Run limit reached ({MAX_RUNS}) for this simulation.")
            cps = self._checkpoints(db, old.id)
            cp = next((c for c in cps if c.idx == checkpoint_index), None)
            if cp is None:
                raise BadRequest(f"Checkpoint {checkpoint_index} does not exist"
                                 + (f" (valid: 0..{cps[-1].idx})." if cps else " (run has no decisions)."))
            original = {d.idx: d.choice_id for d in db.scalars(
                select(DecisionRow).where(DecisionRow.run_id == old.id, DecisionRow.idx >= cp.idx))}
            new, _later, _prev = self._branch(db, sim, old, cps, cp, "replay", n_runs + 1)
            applied: list[str] = []
            stopped = "choices_exhausted"
            for cid in choices:
                if new.status != "active":
                    break
                self._decide_in(db, new, cid)
                applied.append(cid)
            if follow_original:
                idx = cp.idx + len(applied)
                while new.status == "active" and idx in original:
                    try:
                        self._decide_in(db, new, original[idx])
                    except BadRequest:
                        stopped = "original_choice_unavailable"
                        break
                    applied.append(original[idx])
                    idx += 1
            if new.status != "active":
                stopped = new.status
            view = self._view(db, sim, new)
            view["replay_context"] = {"from_run_id": old.id, "checkpoint_index": cp.idx, "applied": applied,
                                      "stopped": stopped, "active_run_id": sim.active_run_id}
            return view

    def restart(self, sim_id: str) -> dict[str, Any]:
        """Fresh run with the same seed. Does not consume a rewind."""
        with self.sf.begin() as db:
            sim = self._sim(db, sim_id)
            old = self._run(db, sim)
            n = db.scalars(select(Run).where(Run.simulation_id == sim.id)).all()
            state = new_simulation(sim.seed, sim.id)
            new = Run(id=_id(), simulation_id=sim.id, parent_run_id=None, kind="restart", attempt=len(n) + 1,
                      status="active", state=state.model_dump(), classification=_public_class(planner.classify(state)))
            db.add(new)
            if old.status == "active":
                old.status = "superseded"
            sim.active_run_id = new.id
            db.flush()
            return self._view(db, sim, new)

    # ------------------------------------------------------------------ stakeholder advice
    def _cached_advice(self, db: Session, run: Run, state: WorldState, stakeholder: str) -> dict[str, Any] | None:
        row = db.scalars(select(StakeholderInteraction).where(
            StakeholderInteraction.run_id == run.id, StakeholderInteraction.round == state.round,
            StakeholderInteraction.stakeholder == stakeholder).order_by(StakeholderInteraction.id.desc())).first()
        if row and row.request.get("decisions") == len(state.decisions):
            return {**row.response, "cached": True}
        return None

    def advise(self, sim_id: str, stakeholder: str) -> dict[str, Any]:
        """Advice from one stakeholder for the current decision. Read-only with respect to the game:
        it never changes the world state. Repeated asks in the same round return the stored answer."""
        if stakeholder not in STAKEHOLDER_IDS:
            raise BadRequest(f"Unknown stakeholder '{stakeholder}'. Choose one of: {', '.join(STAKEHOLDER_IDS)}.")
        with self.sf() as db:                                   # phase 1: read + compute (no write lock held)
            sim = self._sim(db, sim_id)
            run = self._run(db, sim)
            if run.status != "active":
                raise Conflict(f"Advice is only available during an active decision (this run is '{run.status}').")
            state = WorldState.model_validate(run.state)
            hit = self._cached_advice(db, run, state, stakeholder)
            if hit:
                return hit
            previous = None
            if state.decisions:
                cp = db.scalars(select(Checkpoint).where(Checkpoint.run_id == run.id,
                                                         Checkpoint.idx == len(state.decisions) - 1)).first()
                if cp:
                    previous = (WorldState.model_validate(cp.state), state.decisions[-1]["choice_id"])
            core = build_core(stakeholder, state, previous)
            run_id, rnd, n_decisions, seed = run.id, state.round, len(state.decisions), state.seed
        draft = compose(core, seed)
        text, source, note = self.voice.speak(core, draft)      # phase 2: may call a model; no DB held
        advice = {**core, "dialogue": text, "source": source, "note": note, "cached": False,
                  "reaction_text": compose_reaction(core, seed)}
        with self.sf.begin() as db:                             # phase 3: store
            run = db.get(Run, run_id)
            if run is None or run.status != "active" or len(run.state["decisions"]) != n_decisions:
                raise Conflict("The situation changed while the advice was being prepared; ask again.")
            existing = self._cached_advice(db, run, WorldState.model_validate(run.state), stakeholder)
            if existing:
                return existing
            db.add(StakeholderInteraction(run_id=run_id, round=rnd, stakeholder=stakeholder,
                                          request={"decisions": n_decisions, "stakeholder": stakeholder},
                                          response=advice, source=source))
        return advice

    def advice_for_round(self, sim_id: str) -> list[dict[str, Any]]:
        """Advice already given for the current decision of the active run (lets the UI restore it after a refresh)."""
        with self.sf() as db:
            sim = self._sim(db, sim_id)
            run = self._run(db, sim)
            state = WorldState.model_validate(run.state)
            out = []
            for sid in STAKEHOLDER_IDS:
                hit = self._cached_advice(db, run, state, sid)
                if hit:
                    out.append(hit)
            return out

    # ------------------------------------------------------------------ reports and comparison
    def _states(self, db: Session, run: Run) -> list[WorldState]:
        return [WorldState.model_validate(c.state) for c in self._checkpoints(db, run.id)]

    def _stored(self, db: Session, run: Run, kind: str) -> dict[str, Any] | None:
        row = db.scalars(select(Report).where(Report.run_id == run.id)).first()
        rep = row.report if row else None
        if rep and rep.get("kind") == kind and rep.get("version") == rubric.VERSION and rep.get("decision_count") == len(run.state["decisions"]):
            return rep
        return None

    def _store(self, db: Session, run: Run, rep: dict[str, Any]) -> None:
        row = db.scalars(select(Report).where(Report.run_id == run.id)).first()
        score = rep["overall"]["score"] if rep.get("kind") == "final" else None
        if row:
            row.report, row.score = rep, score
        else:
            db.add(Report(run_id=run.id, report=rep, score=score))

    def _final_report(self, db: Session, run: Run) -> dict[str, Any]:
        rep = self._stored(db, run, "final")
        if rep is None:
            rep = build_report(run.id, self._states(db, run), WorldState.model_validate(run.state))
            self._store(db, run, rep)
        return rep

    def _attempt_info(self, db: Session, sim: Simulation, run: Run) -> dict[str, Any]:
        if run.status == "completed":
            rep = self._final_report(db, run)
            quality, score = rep["quality"], rep["overall"]["score"]
        else:
            rep = self._stored(db, run, "attempt")
            if rep is None:
                rep = attempt_quality(self._states(db, run), WorldState.model_validate(run.state))
                rep["version"], rep["decision_count"] = rubric.VERSION, len(run.state["decisions"])
                self._store(db, run, rep)
            quality, score = rep["quality"], None
        return {"run_id": run.id, "attempt": run.attempt, "kind": run.kind, "status": run.status, "ending": run.ending,
                "score": score, "decisions": len(run.state["decisions"]), "quality": quality, "active": run.id == sim.active_run_id,
                "label": f"Attempt {run.attempt}"}

    def report(self, sim_id: str, run_id: str | None = None) -> dict[str, Any]:
        """Final performance report for a finished run, including how this attempt compares with the others."""
        with self.sf.begin() as db:
            sim = self._sim(db, sim_id)
            run = self._run(db, sim, run_id)
            if run.status != "completed":
                raise Conflict(f"The report is available once a run is finished (this one is '{run.status}'). "
                               "Use the comparison or timeline to review an unfinished attempt.")
            rep = self._final_report(db, run)
            runs = list(db.scalars(select(Run).where(Run.simulation_id == sim.id).order_by(Run.created_at)))
            attempts = [self._attempt_info(db, sim, r) for r in runs]
            return {**rep, "attempts": attempts, "simulation_id": sim.id, "seed": sim.seed}

    def compare(self, sim_id: str, base_id: str | None = None, other_id: str | None = None) -> dict[str, Any]:
        """Side-by-side comparison of two runs of the same simulation (same seed)."""
        with self.sf.begin() as db:
            sim = self._sim(db, sim_id)
            runs = list(db.scalars(select(Run).where(Run.simulation_id == sim.id).order_by(Run.created_at)))
            if other_id is None:                      # default: the newest run against the run it branched from
                other_id = runs[-1].id
            other = self._run(db, sim, other_id)
            if base_id is None:
                earlier = [r for r in runs if r.id != other.id]
                if other.parent_run_id:
                    base_id = other.parent_run_id
                elif earlier:
                    base_id = earlier[-1].id
                else:
                    raise BadRequest("There is only one run in this simulation, so there is nothing to compare yet.")
            base = self._run(db, sim, base_id)
            if base.id == other.id:
                raise BadRequest("Choose two different runs to compare.")
            summaries, states = [], []
            for r in (base, other):
                rep = self._final_report(db, r) if r.status == "completed" else None
                summaries.append(run_summary(f"Attempt {r.attempt}", r.id, r.status, WorldState.model_validate(r.state), rep))
                states.append((self._states(db, r), WorldState.model_validate(r.state)))
            out = compare_runs(summaries[0], summaries[1], states[0][0], states[0][1], states[1][0], states[1][1], same_seed=True)
            out["branch"] = {"other_branched_from_base": other.parent_run_id == base.id, "checkpoint_index": other.branch_checkpoint_index}
            return out

    def checkpoint_view(self, sim_id: str, index: int, run_id: str | None = None) -> dict[str, Any]:
        """The decision as it stood at a checkpoint: what was known and which options existed."""
        with self.sf() as db:
            sim = self._sim(db, sim_id)
            run = self._run(db, sim, run_id)
            cp = next((c for c in self._checkpoints(db, run.id) if c.idx == index), None)
            if cp is None:
                raise BadRequest(f"Checkpoint {index} does not exist in this run.")
            state = WorldState.model_validate(cp.state)
            scene = scene_view(state)
            decisions = run.state["decisions"]
            chosen = decisions[index]["choice_id"] if index < len(decisions) else None
            return {"index": index, "round": scene["round"], "clock": scene["clock"], "title": scene["title"], "brief": scene["brief"],
                    "known_info": scene["info"], "risks": active_risks(state), "state": player_state(state), "chosen_choice_id": chosen,
                    "choices": [{**c, "chosen": c["id"] == chosen} for c in scene["choices"]]}

    # ------------------------------------------------------------------ history
    def history(self, sim_id: str, run_id: str | None = None) -> dict[str, Any]:
        with self.sf() as db:
            sim = self._sim(db, sim_id)
            run = self._run(db, sim, run_id)
            decisions = db.scalars(select(DecisionRow).where(DecisionRow.run_id == run.id).order_by(DecisionRow.idx))
            events = db.scalars(select(EventRow).where(EventRow.run_id == run.id).order_by(EventRow.idx))
            return {"run_id": run.id, "status": run.status,
                    "decisions": [{"index": d.idx, "round": d.round, "choice_id": d.choice_id,
                                   "label": d.record["label"], "clock": d.record["clock"],
                                   "effects": d.outcome.get("effects", []), "inherited": d.inherited,
                                   "known_info": d.record["known_info"]} for d in decisions],
                    "events": [{"index": e.idx, "round": e.round, "event_id": e.event_id, "title": e.record["title"],
                                "clock": e.record["clock"], "text": e.record["text"],
                                "effects": e.record.get("effects", []), "inherited": e.inherited} for e in events]}

    def timeline(self, sim_id: str) -> dict[str, Any]:
        """Every run with its decisions and events, plus the branch links between runs."""
        with self.sf() as db:
            sim = self._sim(db, sim_id)
            runs = list(db.scalars(select(Run).where(Run.simulation_id == sim.id).order_by(Run.created_at)))
            out = []
            for r in runs:
                decisions = db.scalars(select(DecisionRow).where(DecisionRow.run_id == r.id).order_by(DecisionRow.idx))
                events = db.scalars(select(EventRow).where(EventRow.run_id == r.id).order_by(EventRow.idx))
                st = r.state
                out.append({
                    "run_id": r.id, "kind": r.kind, "attempt": r.attempt, "status": r.status, "ending": r.ending,
                    "parent_run_id": r.parent_run_id, "branch_checkpoint_index": r.branch_checkpoint_index,
                    "active": r.id == sim.active_run_id,
                    "decisions": [{"index": d.idx, "round": d.round, "clock": d.record["clock"],
                                   "choice_id": d.choice_id, "label": d.record["label"], "inherited": d.inherited}
                                  for d in decisions],
                    "events": [{"index": e.idx, "round": e.round, "clock": e.record["clock"],
                                "title": e.record["title"], "inherited": e.inherited} for e in events],
                    "metrics": {k: st[k] for k in ("budget", "window_min", "system_integrity", "recovery_progress",
                                                   "verified_units", "staff_safety", "public_trust",
                                                   "evidence_quality", "transport_capacity")},
                })
            return {"simulation_id": sim.id, "seed": sim.seed, "active_run_id": sim.active_run_id,
                    "branches": [{"from": r["parent_run_id"], "to": r["run_id"],
                                  "checkpoint_index": r["branch_checkpoint_index"], "kind": r["kind"]}
                                 for r in out if r["parent_run_id"]],
                    "runs": out}

    def runs(self, sim_id: str) -> list[dict[str, Any]]:
        with self.sf() as db:
            sim = self._sim(db, sim_id)
            rows = db.scalars(select(Run).where(Run.simulation_id == sim.id).order_by(Run.created_at))
            return [{"run_id": r.id, "kind": r.kind, "attempt": r.attempt, "status": r.status,
                     "parent_run_id": r.parent_run_id, "branch_checkpoint_index": r.branch_checkpoint_index,
                     "ending": r.ending, "decisions": len(r.state["decisions"]), "active": r.id == sim.active_run_id}
                    for r in rows]


def _public_class(c: dict[str, Any]) -> dict[str, Any]:
    """Planner verdicts reveal solutions (`plan`); persist only what the UI may show."""
    return {k: v for k, v in c.items() if k != "plan"}


def _public_analysis(a: dict[str, Any] | None) -> dict[str, Any] | None:
    if a is None:
        return None
    return {k: v for k, v in a.items() if k != "recovery_plan_from_checkpoint"}
