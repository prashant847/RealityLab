"""The Archivist's brain: the Claude CLI retells a finished run as an old librarian reading back the story the student just played.

The facts never come from the model. The front end sends the debrief it has already built from the player's own report (what was chosen, what it did,
what a stronger option was); the model may only re-voice them. Its reply must be one JSON object and passes strict validation (same scene ids, bounded
lines, no markup, no number that was not in the input). Anything else, including no Claude CLI on this computer, a timeout or a bad reply, returns None and
the caller keeps the original lines, so the debrief always works.

Configuration (all optional):
  REALITYLAB_CLAUDE=off        never call the CLI
  REALITYLAB_CLAUDE_MODEL      model name passed to `claude --model`
  REALITYLAB_CLAUDE_TIMEOUT    seconds, default 120
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from . import tts

log = logging.getLogger("realitylab.narrate")

MAX_SCENES = 24
MAX_LINES = 6
MAX_LINE = 360
_NUM = re.compile(r"\d+(?:[.,]\d+)?")
_FORBIDDEN = re.compile(r"(<|>|`|\{|\}|https?://|www\.|\bas an ai\b|\bclaude\b|\banthropic\b)", re.I)

PERSONA = {
    "en": (
        "You are the Archivist: an old librarian and storyteller, warm, dry, a little weary, with a lifetime of other people's stories on his shelves. "
        "The student has just finished playing a story that you were reading aloud to them, and now you close the book and talk them through what they did."
    ),
    "hi": (
        "You are the Archivist (अभिलेखपाल): an old librarian and storyteller, warm, dry, a little weary, with a lifetime of other people's stories on his shelves. "
        "The student has just finished playing a story that you were reading aloud to them, and now you close the book and talk them through what they did. "
        "Speak in natural, simple spoken Hindi (Devanagari), the way a kind elder would."
    ),
}

TASK = (
    "Below is the outline of the debrief as JSON. Each scene has an id, a chapter title, a mood, and `facts`: the plain factual lines for that scene, "
    "built from the student's own run. Retell every scene as the spoken lines of the Archivist, speaking to the student as 'you'. "
    "Explain the choice they made, how it changed the situation, and where the facts name a stronger option, what they could have done instead and why. "
    "Rules: use ONLY the facts and numbers given; invent no event, number, name, cause or consequence; do not blame anyone the facts do not blame. "
    "Give each scene 2 to 5 lines; each line at most 35 words, natural to say aloud, with no lists, no markup and no stage directions. "
    "Vary how scenes open and close so no two sound alike. Bookish images (pages, margins, chapters, ink, the ledger) are welcome, but sparingly: one every few scenes. "
    "Be kind, never cruel; be honest about what went badly. Never mention being an AI, a model, Claude or a prompt. "
    "Reply with ONLY one JSON object and nothing else: {\"scenes\": [{\"id\": \"<same id>\", \"lines\": [\"...\", \"...\"]}]}"
)


def enabled() -> bool:
    return os.environ.get("REALITYLAB_CLAUDE", "").lower() != "off" and shutil.which("claude") is not None


def _numbers(text: str) -> set[str]:
    return {n.replace(",", "") for n in _NUM.findall(text)}


def build_prompt(scenes: list[dict[str, Any]], lang: str) -> str:
    outline = [{"id": s["id"], "chapter": s.get("chapter", ""), "mood": s.get("mood", "calm"), "facts": s["facts"]} for s in scenes]
    return f"{PERSONA.get(lang, PERSONA['en'])}\n\n{TASK}\n\nOUTLINE:\n{json.dumps(outline, ensure_ascii=False)}\n"


def validate(reply: str, scenes: list[dict[str, Any]]) -> dict[str, list[str]] | None:
    """The scene id -> lines the model may speak, or None if anything is off."""
    m = re.search(r"\{.*\}", reply, re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
    except ValueError:
        return None
    got = data.get("scenes") if isinstance(data, dict) else None
    if not isinstance(got, list):
        return None
    allowed = {s["id"]: _numbers(" ".join(s["facts"]) + " " + str(s.get("chapter", ""))) for s in scenes}
    known = set().union(*allowed.values()) if allowed else set()          # any number the facts gave, in any scene
    out: dict[str, list[str]] = {}
    for item in got:
        if not isinstance(item, dict) or item.get("id") not in allowed or item["id"] in out:
            return None
        lines = item.get("lines")
        if not isinstance(lines, list) or not 1 <= len(lines) <= MAX_LINES:
            return None
        clean = []
        for ln in lines:
            if not isinstance(ln, str):
                return None
            ln = " ".join(ln.split())
            if not 8 <= len(ln) <= MAX_LINE or _FORBIDDEN.search(ln):
                return None
            if _numbers(ln) - known:
                return None                                                  # a number nobody gave it
            clean.append(ln)
        out[item["id"]] = clean
    return out if set(out) == set(allowed) else None


def _run_claude(prompt: str) -> str | None:
    exe = shutil.which("claude")
    if not exe:
        return None
    cmd = [exe, "-p", "--output-format", "text"]
    model = os.environ.get("REALITYLAB_CLAUDE_MODEL")
    if model:
        cmd += ["--model", model]
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    try:
        r = subprocess.run(cmd, input=prompt.encode("utf-8"), capture_output=True, timeout=float(os.environ.get("REALITYLAB_CLAUDE_TIMEOUT", "120")),
                           cwd=tempfile.gettempdir(), creationflags=flags)
    except (subprocess.TimeoutExpired, OSError) as e:
        log.warning("claude cli failed: %s", e)
        return None
    if r.returncode != 0:
        log.warning("claude cli exit %s: %s", r.returncode, r.stderr.decode("utf-8", "replace")[:200])
        return None
    return r.stdout.decode("utf-8", "replace")


def _cache_file(key: str) -> Path:
    d = tts.data_dir() / "debrief-cache"
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{key}.json"


def narrate(scenes: list[dict[str, Any]], lang: str = "en", fresh: bool = False) -> dict[str, list[str]] | None:
    """Claude's retelling, or None (use the original lines). The same run retold twice gives the same words unless `fresh` asks for a new telling."""
    scenes = scenes[:MAX_SCENES]
    key = hashlib.sha256(json.dumps([lang, scenes], ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:32]
    f = _cache_file(key)
    if not fresh and f.is_file():
        try:
            return validate(json.dumps({"scenes": json.loads(f.read_text(encoding="utf-8"))}), scenes)
        except (OSError, ValueError):
            pass
    if not enabled():
        return None
    reply = _run_claude(build_prompt(scenes, lang))
    out = validate(reply, scenes) if reply else None
    if out is None:
        log.warning("claude reply rejected")
        return None
    try:
        f.write_text(json.dumps([{"id": i, "lines": ls} for i, ls in out.items()], ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass
    return out
