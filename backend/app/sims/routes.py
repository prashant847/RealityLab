from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from fastapi import HTTPException, Response

from . import tts
from .service import SimsService

router = APIRouter(prefix="/api")


def svc(request: Request) -> SimsService:
    return request.app.state.sims


S = Depends(svc)


class DecisionBody(BaseModel):
    choice_id: str = Field(min_length=1, max_length=40)


class ReflectionBody(BaseModel):
    enjoyment: int = Field(ge=1, le=5)
    stress: int = Field(ge=1, le=5)
    daily_interest: int = Field(ge=1, le=5)
    note: str = Field("", max_length=400)


class ChoiceBody(BaseModel):
    career: str = Field("", max_length=32)            # empty clears the choice
    reason: str = Field("", max_length=600)


class TtsBody(BaseModel):
    text: str = Field(min_length=1, max_length=tts.MAX_CHARS)
    voice: str = Field("female", pattern="^(female|male|heroic|hindi)$")
    rate: float = Field(1.0, ge=0.5, le=2.0)


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


@router.get("/blackout/current", summary="The unfinished BLACKOUT simulation, if any")
def blackout_current(s: SimsService = S):
    return s.blackout_current()


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


@router.get("/runs/{run_id}/reflection")
def get_reflection(run_id: str, s: SimsService = S):
    return s.get_reflection(run_id)


@router.post("/runs/{run_id}/reflection", summary="How the student felt about a finished workday or crisis (feeds Career Comparison)")
def post_reflection(run_id: str, body: ReflectionBody, s: SimsService = S):
    return s.save_reflection(run_id, body.enjoyment, body.stress, body.daily_interest, body.note)


@router.get("/careers", summary="Career Comparison: each profession's profile next to what the student experienced")
def careers(s: SimsService = S):
    return s.careers()


@router.get("/career-choice", summary="The career the student says they would opt for, if they have decided")
def get_choice(s: SimsService = S):
    return s.get_choice()


@router.put("/career-choice", summary="Record the student's own choice (it is not computed or recommended by the app)")
def put_choice(body: ChoiceBody, s: SimsService = S):
    return s.save_choice(body.career, body.reason)


@router.get("/tts/status", summary="Which natural read-aloud voices are installed on this computer")
def tts_status() -> dict:
    return {"voices": tts.available_voices()}


@router.post("/tts", summary="Speak text with the offline natural voice (WAV)", response_class=Response)
def tts_speak(body: TtsBody) -> Response:
    try:
        wav = tts.synthesize(body.text, body.voice, body.rate)
    except LookupError:
        raise HTTPException(404, "natural voice not installed")
    except (RuntimeError, ValueError):
        raise HTTPException(502, "speech failed")
    return Response(wav, media_type="audio/wav", headers={"Cache-Control": "private, max-age=3600"})
