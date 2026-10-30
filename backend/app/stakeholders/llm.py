"""Optional language-model phrasing for stakeholder dialogue.

The model never decides anything. It is handed the *finished* structured advice (recommendation,
reasons, public facts, the agent's own claims) plus a deterministic draft, and may only rephrase
it in the character's voice. Its reply must be one small JSON object and passes strict validation
(no markup, bounded length, no numbers that were not in the context, no attribution claims).
Anything else, including any error or timeout, falls back to the deterministic draft.

Configuration (all optional; with no key the game is fully playable and fully deterministic):
  ANTHROPIC_API_KEY  or  REALITYLAB_LLM_KEY   API key
  REALITYLAB_LLM_MODEL                          default: claude-haiku-5-5
  REALITYLAB_LLM_TIMEOUT                        seconds, default 8
  REALITYLAB_LLM_URL                            Messages-API endpoint (default: Anthropic; for gateways/tests)
  REALITYLAB_LLM=off                            disable even if a key is present
"""
from __future__ import annotations

import json
import logging
import os
import re
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable, Protocol

from .agents import AGENTS

log = logging.getLogger("realitylab.llm")

MIN_LEN, MAX_LEN = 20, 420
_NUM = re.compile(r"\d+(?:\.\d+)?")
_FORBIDDEN = re.compile(
    r"(<|>|`|\{|\}|https?://|www\.|\bhacked by\b|\battacked by\b|\bcaused by the (?:3pl|partner|vendor|supplier)\b|\bproven\b|\bproved\b)",
    re.I)

SYSTEM = (
    "You write ONE short line of in-character dialogue for a fictional workplace-crisis simulation. "
    "You are given a finished decision from the character and a draft of how they would say it. "
    "Rephrase the draft in the character's voice. Rules: keep the same recommendation, reasons, objections and "
    "caveats; use ONLY facts and numbers present in the input; never add new facts, numbers, names or events; "
    "if a claim is marked unverified, keep it hedged; never state who is responsible for the incident; at most 70 words; "
    "plain text only, no markup. Reply with exactly one JSON object: {\"dialogue\": \"...\"} and nothing else."
)


class Provider(Protocol):
    def complete(self, system: str, user: str) -> str: ...


class Invalid(Exception):
    pass


@dataclass(frozen=True)
class LLMConfig:
    api_key: str
    model: str = "claude-haiku-5-5"
    timeout: float = 8.0
    url: str = "https://api.anthropic.com/v1/messages"


def config_from_env(env: dict[str, str] | None = None) -> LLMConfig | None:
    e = os.environ if env is None else env
    if e.get("REALITYLAB_LLM", "").lower() in ("off", "0", "false", "none"):
        return None
    key = e.get("REALITYLAB_LLM_KEY") or e.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        timeout = float(e.get("REALITYLAB_LLM_TIMEOUT", "8"))
    except ValueError:
        timeout = 8.0
    return LLMConfig(api_key=key, model=e.get("REALITYLAB_LLM_MODEL", "claude-haiku-5-5"), timeout=timeout,
                     url=e.get("REALITYLAB_LLM_URL", LLMConfig.url))


class AnthropicProvider:
    """Minimal Messages API client using only the standard library. `transport` is injectable for tests."""

    def __init__(self, cfg: LLMConfig, transport: Callable[[urllib.request.Request, float], bytes] | None = None):
        self.cfg = cfg
        self._transport = transport or self._http

    @staticmethod
    def _http(req: urllib.request.Request, timeout: float) -> bytes:
        with urllib.request.urlopen(req, timeout=timeout) as r:   # noqa: S310 (fixed https URL)
            return r.read()

    def complete(self, system: str, user: str) -> str:
        body = json.dumps({"model": self.cfg.model, "max_tokens": 300, "system": system,
                           "messages": [{"role": "user", "content": user}]}).encode()
        req = urllib.request.Request(self.cfg.url, data=body, method="POST", headers={
            "content-type": "application/json", "x-api-key": self.cfg.api_key, "anthropic-version": "2023-06-01"})
        data = json.loads(self._transport(req, self.cfg.timeout))
        return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")


def provider_from_env(env: dict[str, str] | None = None) -> Provider | None:
    cfg = config_from_env(env)
    return AnthropicProvider(cfg) if cfg else None


# ------------------------------------------------------------------ context + validation
def build_context(core: dict[str, Any], draft: str) -> dict[str, Any]:
    """Everything the model sees. Deliberately excludes raw state, hidden values and other agents."""
    a = AGENTS[core["stakeholder"]]
    return {
        "character": {"name": a.name, "role": a.role, "voice": a.style, "goals": list(a.goals)},
        "time": core["clock"],
        "recommendation": core["recommendation_label"],
        "reasons": core["recommendation_reasons"],
        "objection": core["objection"],
        "confidence_percent": core["confidence"],
        "uncertainty": core["uncertainty"],
        "facts": core["facts"],
        "own_claims": [{"text": p["text"], "verified": p["verified"]} for p in core["private"]],
        "draft": draft,
    }


def allowed_numbers(ctx: dict[str, Any]) -> set[str]:
    return set(_NUM.findall(json.dumps(ctx, ensure_ascii=False)))


def parse_and_validate(raw: str, allowed: set[str]) -> str:
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        raise Invalid("no_json")
    try:
        obj = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        raise Invalid("bad_json") from e
    if not isinstance(obj, dict) or set(obj) != {"dialogue"} or not isinstance(obj["dialogue"], str):
        raise Invalid("schema")
    text = " ".join(obj["dialogue"].split())
    if not MIN_LEN <= len(text) <= MAX_LEN:
        raise Invalid("length")
    if _FORBIDDEN.search(text):
        raise Invalid("forbidden_content")
    extra = set(_NUM.findall(text)) - allowed
    if extra:
        raise Invalid(f"invented_number:{sorted(extra)[0]}")
    return text


class Voice:
    """Chooses between the deterministic draft and (validated) model phrasing."""

    def __init__(self, provider: Provider | None = None):
        self.provider = provider

    @property
    def enabled(self) -> bool:
        return self.provider is not None

    def speak(self, core: dict[str, Any], draft: str) -> tuple[str, str, str | None]:
        """Returns (text, source, note). source is 'llm' only for validated model output."""
        if self.provider is None:
            return draft, "policy", None
        ctx = build_context(core, draft)
        try:
            raw = self.provider.complete(SYSTEM, json.dumps(ctx, ensure_ascii=False))
            return parse_and_validate(raw, allowed_numbers(ctx)), "llm", None
        except Invalid as e:
            log.info("LLM output rejected: %s", e)
            return draft, "policy", f"llm_rejected:{e}"
        except Exception as e:  # network, timeout, auth, malformed envelope: never break the game
            log.warning("LLM unavailable: %s", type(e).__name__)
            return draft, "policy", f"llm_unavailable:{type(e).__name__}"
