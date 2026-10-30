"""Request/response models. Requests are strict (unknown fields rejected); responses document the
shape clients can rely on. Nested game data stays as plain dicts so scenario content can evolve
without breaking the contract."""
from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ChoiceId = Annotated[str, Field(min_length=3, max_length=40, pattern=r"^r\d{1,2}_[a-z_]+$",
                                description="Choice identifier such as 'r1_isolate'.")]
CheckpointIndex = Annotated[int, Field(ge=0, le=9, description="Index of the decision to branch from.")]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateSimulationRequest(StrictModel):
    seed: int | None = Field(None, ge=0, le=2**31 - 1, description="Omit for a random seed.")
    max_rewinds: int = Field(5, ge=0, le=20)


class DecisionRequest(StrictModel):
    choice_id: ChoiceId


class RewindRequest(StrictModel):
    checkpoint_index: CheckpointIndex | None = Field(
        None, description="Omit to use the last recoverable checkpoint (dead-end runs).")


class ReplayRequest(StrictModel):
    checkpoint_index: CheckpointIndex
    choices: list[ChoiceId] = Field(min_length=1, max_length=10)
    follow_original: bool = Field(False, description="After `choices`, keep following the original run's "
                                  "later choices while they remain available.")


class SimulationInfo(BaseModel):
    id: str
    seed: int
    active_run_id: str | None
    rewinds_used: int
    max_rewinds: int
    rewinds_left: int


class RunInfo(BaseModel):
    id: str
    kind: str
    attempt: int
    status: str
    parent_run_id: str | None
    branch_checkpoint_index: int | None
    accepted_risk: bool
    ending: str | None


class SimulationView(BaseModel):
    simulation: SimulationInfo
    run: RunInfo
    state: dict[str, Any]
    scene: dict[str, Any]
    risks: list[dict[str, str]]
    analysis: dict[str, Any] | None
    checkpoints: list[dict[str, Any]]
    rewind_context: dict[str, Any] | None = None
    replay_context: dict[str, Any] | None = None


class DecisionResponse(SimulationView):
    outcome: dict[str, Any]


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[dict[str, Any]] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


StakeholderId = Literal["kavya", "arjun", "nisha", "raghav", "isha"]


class AdviceRequest(StrictModel):
    stakeholder: StakeholderId


class AdviceView(BaseModel):
    stakeholder: StakeholderId
    name: str
    role: str
    round: int
    clock: str
    recommendation: str | None
    recommendation_label: str | None
    confidence: int
    uncertainty: str | None
    stances: list[dict[str, Any]]
    facts: list[str]
    private: list[dict[str, Any]]
    reaction: dict[str, Any] | None
    reaction_text: str | None
    dialogue: str
    source: Literal["policy", "llm"]
    note: str | None
    cached: bool
