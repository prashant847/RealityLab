from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from fastapi import HTTPException, Response

from . import generate, narrate_ai, tts
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
    voice: str = Field("female", pattern=tts.ROLE_PATTERN)
    rate: float = Field(1.0, ge=0.5, le=2.0)


class ProfileBody(BaseModel):
    name: str | None = Field(None, max_length=60)
    large_text: bool | None = None
    reduce_motion: bool | None = None


@router.get("/library", summary="All simulations with this player's progress")
def library(s: SimsService = S):
    return s.library()


@router.get("/labs", summary="The technical-work simulations (circuit, surgery) with this player's progress")
def labs(s: SimsService = S):
    return s.labs()


@router.get("/certificates", summary="One certificate per simulation: earned by making the best choice at every step")
def certificates(s: SimsService = S):
    return s.certificates()


class GenerateBody(BaseModel):
    prompt: str = Field(min_length=12, max_length=generate.MAX_PROMPT)
    kind: str = Field(pattern="^(technical|normal)$")


JOBS = generate.Jobs()


@router.post("/generate", status_code=202, summary="Have the Claude CLI write a new simulation from a description (runs in the background)")
def start_generation(body: GenerateBody):
    if not generate.enabled():
        raise HTTPException(503, "The Claude CLI is not available on this computer, so simulations cannot be written.")
    try:
        return JOBS.start(body.prompt.strip(), body.kind)
    except RuntimeError:
        raise HTTPException(409, "A simulation is already being written. Wait for it to finish.")


@router.get("/generate/jobs", summary="Recent generation jobs, newest first")
def generation_jobs():
    return {"enabled": generate.enabled(), "jobs": JOBS.recent()}


@router.get("/generated", summary="The simulations the player had written")
def generated(s: SimsService = S):
    return s.generated()


@router.delete("/generated/{sim_id}", summary="Delete a generated simulation and its runs")
def delete_generated(sim_id: str, s: SimsService = S):
    if not s.delete_generated(sim_id):
        raise HTTPException(404, "No generated simulation with that id.")
    return {"deleted": sim_id}


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


@router.get("/tts/status", summary="Which read-aloud voices are available on this computer")
def tts_status() -> dict:
    return {"voices": tts.available_voices(), "human": tts.human_available(), "roles": sorted(tts.HUMAN)}


@router.post("/tts", summary="Speak text with a human voice (MP3) or the offline natural voice (WAV)", response_class=Response)
def tts_speak(body: TtsBody) -> Response:
    try:
        audio, kind = tts.synthesize_audio(body.text, body.voice, body.rate)
    except LookupError:
        raise HTTPException(404, "natural voice not installed")
    except (RuntimeError, ValueError):
        raise HTTPException(502, "speech failed")
    return Response(audio, media_type=kind, headers={"Cache-Control": "private, max-age=3600"})


class VoiceKeyBody(BaseModel):
    key: str = Field(min_length=16, max_length=200, pattern=r"^[A-Za-z0-9_\-]+$")


@router.put("/tts/key", summary="Save an ElevenLabs API key on this computer to enable the human voices")
def tts_save_key(body: VoiceKeyBody) -> dict:
    if not tts.check_key(body.key):
        raise HTTPException(400, "ElevenLabs did not accept that key")
    tts.set_key(body.key)
    return {"human": True}


@router.delete("/tts/key", summary="Forget the saved ElevenLabs key")
def tts_forget_key() -> dict:
    tts.clear_key()
    return {"human": tts.human_available()}


class DebriefScene(BaseModel):
    id: str = Field(min_length=1, max_length=60)
    chapter: str = Field("", max_length=160)
    mood: str = Field("calm", max_length=16)
    facts: list[str] = Field(min_length=1, max_length=12)


class DebriefBody(BaseModel):
    scenes: list[DebriefScene] = Field(min_length=1, max_length=narrate_ai.MAX_SCENES)
    lang: str = Field("en", pattern="^(en|hi|hinglish)$")
    fresh: bool = False


@router.post("/debrief/narrate", summary="The Archivist (Claude, via the Claude CLI on this computer) retells the debrief in his own words")
def debrief_narrate(body: DebriefBody) -> dict:
    """`source` is "claude" with the retold lines, or "original" (no CLI, a timeout, or a reply that failed validation) and the caller keeps its own lines."""
    scenes = [s.model_dump() for s in body.scenes]
    for s in scenes:
        s["facts"] = [f[:600] for f in s["facts"]]
    out = narrate_ai.narrate(scenes, body.lang, body.fresh)
    if out is None:
        return {"source": "original", "scenes": []}
    return {"source": "claude", "scenes": [{"id": i, "lines": ls} for i, ls in out.items()]}


@router.get("/debrief/narrate/status", summary="Whether the Claude CLI is available to tell the debrief")
def debrief_status() -> dict:
    return {"claude": narrate_ai.enabled()}
