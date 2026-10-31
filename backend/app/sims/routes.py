from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from .service import SimsService

router = APIRouter(prefix="/api")


def svc(request: Request) -> SimsService:
    return request.app.state.sims


S = Depends(svc)


class DecisionBody(BaseModel):
    choice_id: str = Field(min_length=1, max_length=40)


class ProfileBody(BaseModel):
    name: str | None = Field(None, max_length=60)
    large_text: bool | None = None
    reduce_motion: bool | None = None


@router.get("/library", summary="All simulations with this player's progress")
def library(s: SimsService = S):
    return s.library()


@router.get("/journey", summary="Completed simulations and skills across them")
def journey(s: SimsService = S):
    return s.journey()


@router.get("/profile")
def get_profile(s: SimsService = S):
    return s.profile()


@router.put("/profile")
def put_profile(body: ProfileBody, s: SimsService = S):
    return s.update_profile(body.name, body.large_text, body.reduce_motion)


@router.get("/sims/{sim_id}/intro")
def intro(sim_id: str, s: SimsService = S):
    return s.intro(sim_id)


@router.post("/sims/{sim_id}/runs", status_code=201, summary="Start a new run (an unfinished run of the same simulation is closed)")
def start(sim_id: str, s: SimsService = S):
    return s.start(sim_id)


@router.get("/sims/{sim_id}/runs/current", summary="The unfinished run, if any")
def current(sim_id: str, s: SimsService = S):
    return s.current(sim_id)


@router.get("/runs/{run_id}")
def run_view(run_id: str, s: SimsService = S):
    return s.view(run_id)


@router.post("/runs/{run_id}/decisions")
def run_decide(run_id: str, body: DecisionBody, s: SimsService = S):
    return s.decide(run_id, body.choice_id)


@router.get("/runs/{run_id}/report")
def run_report(run_id: str, s: SimsService = S):
    return s.report(run_id)
