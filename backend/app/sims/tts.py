"""Offline neural text-to-speech for "Read aloud" (Piper, MIT licence). Everything runs on this computer."""
from __future__ import annotations

import hashlib
import os
import subprocess
import tempfile
from pathlib import Path

# female: clear English read-aloud voice. male: the deep British voice of the Archivist (and the male read-aloud voice). heroic: the deep American voice of the Archivist's commanding style. hindi: the Archivist in Hindi.
VOICES = {"female": "en_US-lessac-medium", "male": "en_GB-alan-medium", "heroic": "en_US-joe-medium", "hindi": "hi_IN-pratham-medium"}
MAX_CHARS = 700                  # the page sends sentence-sized pieces; this is a safety limit
_CACHE_LIMIT = 80


def voice_dir() -> Path | None:
    d = os.environ.get("REALITYLAB_VOICE_DIR")
    return Path(d) if d else None


def _exe(d: Path) -> Path:
    return d / "piper" / "piper.exe"


def available_voices() -> list[str]:
    d = voice_dir()
    if not d or not _exe(d).is_file():
        return []
    return [k for k, v in VOICES.items() if (d / f"{v}.onnx").is_file() and (d / f"{v}.onnx.json").is_file()]


def _cache_dir() -> Path:
    p = Path(tempfile.gettempdir()) / "realitylab-tts"
    p.mkdir(parents=True, exist_ok=True)
    return p


def synthesize(text: str, voice: str = "female", rate: float = 1.0) -> bytes:
    """Returns a WAV. Raises LookupError if the voice isn't installed, RuntimeError if Piper fails."""
    d = voice_dir()
    if voice not in available_voices() or d is None:
        raise LookupError("voice not installed")
    text = " ".join(text.split())[:MAX_CHARS]
    if not text:
        raise ValueError("empty text")
    rate = min(max(rate, 0.5), 2.0)
    key = hashlib.sha256(f"{voice}|{rate:.2f}|{text}".encode("utf-8")).hexdigest()[:32]
    out = _cache_dir() / f"{key}.wav"
    if out.is_file():
        return out.read_bytes()
    model = d / f"{VOICES[voice]}.onnx"
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    try:
        r = subprocess.run(
            [str(_exe(d)), "--model", str(model), "--output_file", str(out), "--length_scale", f"{1 / rate:.3f}"],
            input=text.encode("utf-8"), capture_output=True, timeout=60, creationflags=flags, cwd=str(_exe(d).parent),
        )
    except subprocess.TimeoutExpired as e:
        raise RuntimeError("speech timed out") from e
    if r.returncode != 0 or not out.is_file():
        raise RuntimeError("speech engine failed")
    files = sorted(_cache_dir().glob("*.wav"), key=lambda f: f.stat().st_mtime)
    for old in files[:-_CACHE_LIMIT]:
        old.unlink(missing_ok=True)
    return out.read_bytes()
