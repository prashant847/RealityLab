from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, status

from ..services.simulations import SimulationService
from .schemas import (AdviceRequest, AdviceView, CreateSimulationRequest, DecisionRequest, DecisionResponse, ErrorResponse, ReplayRequest,
                      RewindRequest, SimulationView)

router = APIRouter(prefix="/api")
_ERRORS = {404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}, 422: {"model": ErrorResponse}}
RunQuery = Query(None, min_length=1, max_length=32, description="A specific run (branch). Defaults to the active run.")


def service(request: Request) -> SimulationService:
    return request.app.state.service


Svc = Depends(service)


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/simulations", response_model=SimulationView, status_code=status.HTTP_201_CREATED,
             responses=_ERRORS, summary="Create a new simulation")
def create_simulation(body: CreateSimulationRequest, svc: SimulationService = Svc):
    return svc.create(seed=body.seed, max_rewinds=body.max_rewinds)


@router.get("/simulations/{simulation_id}", response_model=SimulationView, responses=_ERRORS,
            summary="Current state and scene (survives page refresh)")
def get_simulation(simulation_id: str, run_id: str | None = RunQuery, svc: SimulationService = Svc):
    return svc.view(simulation_id, run_id)


@router.post("/simulations/{simulation_id}/decisions", response_model=DecisionResponse, responses=_ERRORS,
             summary="Validate and apply a player action")
def decide(simulation_id: str, body: DecisionRequest, svc: SimulationService = Svc):
    return svc.decide(simulation_id, body.choice_id)


@router.get("/simulations/{simulation_id}/history", responses=_ERRORS,
            summary="Decisions and events of a run, with what was known at each decision")
def history(simulation_id: str, run_id: str | None = RunQuery, svc: SimulationService = Svc):
    return svc.history(simulation_id, run_id)


@router.get("/simulations/{simulation_id}/timeline", responses=_ERRORS,
            summary="All runs (attempts and branches) with their decisions, for side-by-side comparison")
def timeline(simulation_id: str, svc: SimulationService = Svc):
    return svc.timeline(simulation_id)


@router.post("/simulations/{simulation_id}/rewind", response_model=SimulationView, responses=_ERRORS,
             summary="Branch from a recoverable checkpoint; the previous run is preserved")
def rewind(simulation_id: str, body: RewindRequest | None = None, svc: SimulationService = Svc):
    return svc.rewind(simulation_id, body.checkpoint_index if body else None)


@router.post("/simulations/{simulation_id}/continue", response_model=SimulationView, responses=_ERRORS,
             summary="Continue a soft dead end, accepting a degraded outcome")
def continue_anyway(simulation_id: str, svc: SimulationService = Svc):
    return svc.continue_anyway(simulation_id)


@router.post("/simulations/{simulation_id}/restart", response_model=SimulationView, responses=_ERRORS,
             summary="Start over with the same seed (earlier runs are kept)")
def restart(simulation_id: str, svc: SimulationService = Svc):
    return svc.restart(simulation_id)


@router.post("/simulations/{simulation_id}/replay", response_model=SimulationView, responses=_ERRORS,
             summary="Counterfactual: run an alternate branch from any checkpoint without changing the active run")
def replay(simulation_id: str, body: ReplayRequest, svc: SimulationService = Svc):
    return svc.replay(simulation_id, body.checkpoint_index, body.choices, body.follow_original)


@router.post("/simulations/{simulation_id}/stakeholder-advice", response_model=AdviceView, responses=_ERRORS,
             summary="Ask a stakeholder for advice on the current decision (read-only; never changes the world)")
def stakeholder_advice(simulation_id: str, body: AdviceRequest, svc: SimulationService = Svc):
    return svc.advise(simulation_id, body.stakeholder)


@router.get("/simulations/{simulation_id}/stakeholder-advice", response_model=list[AdviceView], responses=_ERRORS,
            summary="Advice already given for the current decision")
def stakeholder_advice_so_far(simulation_id: str, svc: SimulationService = Svc):
    return svc.advice_for_round(simulation_id)


@router.get("/simulations/{simulation_id}/report", responses=_ERRORS,
            summary="Final performance report: transparent scores, decision ratings, losses, alternatives, attempt progress")
def report(simulation_id: str, run_id: str | None = RunQuery, svc: SimulationService = Svc):
    return svc.report(simulation_id, run_id)


@router.get("/simulations/{simulation_id}/compare", responses=_ERRORS,
            summary="Side-by-side comparison of two runs (default: the active run against the run it branched from)")
def compare(simulation_id: str, base: str | None = Query(None, min_length=1, max_length=32),
            other: str | None = Query(None, min_length=1, max_length=32), svc: SimulationService = Svc):
    return svc.compare(simulation_id, base, other)


@router.get("/simulations/{simulation_id}/checkpoints/{index}", responses=_ERRORS,
            summary="A past decision as it stood: what was known and which options existed")
def checkpoint(simulation_id: str, index: int, run_id: str | None = RunQuery, svc: SimulationService = Svc):
    return svc.checkpoint_view(simulation_id, index, run_id)
