"""Offline neural text-to-speech for "Read aloud" (Piper, MIT licence). Everything runs on this computer."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

# female: clear English read-aloud voice. male: the deep British voice of the Archivist (and the male read-aloud voice). heroic: the deep American voice of the Archivist's commanding style. hindi: the Archivist in Hindi.
VOICES = {"female": "en_US-lessac-medium", "male": "en_GB-alan-medium", "heroic": "en_US-joe-medium", "hindi": "hi_IN-pratham-medium"}
MAX_CHARS = 700                  # the page sends sentence-sized pieces; this is a safety limit
_CACHE_LIMIT = 80

# ------------------------------------------------------------------------------------------------ human voices (ElevenLabs)
# With an ElevenLabs API key (the ELEVENLABS_API_KEY environment variable, or one saved from Settings), speech comes from real human-sounding voices:
# a role names a voice (several ids are tried in order, so a voice that is not available to this account falls through to the next) and how it is delivered.
# Without a key everything below is skipped and the offline Piper voices are used, exactly as before.
_API = "https://api.elevenlabs.io/v1"
ALICE, MATILDA, LILY, BELLA = "Xb7hH8MSUJpSbSDYk0k2", "XrExE9yKIg1WjnnlVkGX", "pFZP5JQG7iQjIQuC4Bku", "hpp4J3VqNfWAUOO0d1Us"
GEORGE, DANIEL = "JBFqnCBsd6RMkjVDRZzb", "onwK4e9ZLuTAKqWW03F9"
OG_VEE, DR_PARR, ARKADIUS, KEITH = "0pjnESKN8BUbyt1sQqAz", "QTsFt9OpsJoyxbXFpdFz", "O4uxPTtvgxrA0QCLHI1J", "Bz3xOImr0NCCz7YRPW4s"
_QUALITY, _FAST = "eleven_multilingual_v2", "eleven_flash_v2_5"
# role -> voice ids, model, delivery (stability high = flat and deadpan; style low = understated), speed, and the offline voice to use when there is no key
HUMAN: dict[str, dict] = {
    "reader_female": dict(ids=[ALICE, MATILDA], model=_QUALITY, stab=0.55, style=0.12, speed=1.0, piper="female"),
    "reader_male": dict(ids=[GEORGE, DANIEL], model=_QUALITY, stab=0.55, style=0.12, speed=1.0, piper="male"),
    # the comic's narrator: a tired, deadpan man who has explained this sort of thing too many times
    "narrator": dict(ids=[OG_VEE, DANIEL], model=_QUALITY, stab=0.85, style=0.0, speed=0.9, piper="male"),
    # the Archivist: an old librarian and storyteller
    "librarian": dict(ids=[ARKADIUS, KEITH, GEORGE], model=_QUALITY, stab=0.5, style=0.35, speed=0.92, piper="heroic"),
    "char_director": dict(ids=[GEORGE, DANIEL], model=_FAST, stab=0.5, style=0.2, speed=1.0, piper="male"),
    "char_arjun": dict(ids=[DANIEL, GEORGE], model=_FAST, stab=0.45, style=0.2, speed=1.05, piper="male"),
    "char_raghav": dict(ids=[DR_PARR, GEORGE], model=_FAST, stab=0.5, style=0.2, speed=0.95, piper="male"),
    "char_kavya": dict(ids=[MATILDA, ALICE], model=_FAST, stab=0.45, style=0.25, speed=1.05, piper="female"),
    "char_nisha": dict(ids=[LILY, ALICE], model=_FAST, stab=0.5, style=0.2, speed=1.0, piper="female"),
    "char_isha": dict(ids=[BELLA, MATILDA], model=_FAST, stab=0.5, style=0.2, speed=1.0, piper="female"),
}
ALIASES = {"female": "reader_female", "male": "reader_male"}      # the original two read-aloud voices become human ones when a key is present
ROLE_PATTERN = "^(" + "|".join(["female", "male", "heroic", "hindi", *HUMAN]) + ")$"
_HUMAN_CACHE_LIMIT = 600


def data_dir() -> Path:
    """Where this computer keeps the app's own files (next to the database)."""
    url = os.environ.get("REALITYLAB_DB", "")
    if url.startswith("sqlite:///"):
        return Path(url[len("sqlite:///"):]).parent
    return Path(tempfile.gettempdir()) / "realitylab"


def _key_file() -> Path:
    return data_dir() / "elevenlabs.key"


def get_key() -> str | None:
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if k:
        return k
    try:
        k = _key_file().read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return k or None


def human_available() -> bool:
    return get_key() is not None


def set_key(key: str) -> None:
    d = data_dir()
    d.mkdir(parents=True, exist_ok=True)
    _key_file().write_text(key.strip(), encoding="utf-8")


def clear_key() -> None:
    _key_file().unlink(missing_ok=True)


def check_key(key: str) -> bool:
    """True if ElevenLabs accepts the key."""
    req = urllib.request.Request(f"{_API}/voices?page_size=1", headers={"xi-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            return r.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def _human_cache() -> Path:
    p = data_dir() / "tts-cache"
    p.mkdir(parents=True, exist_ok=True)
    return p


class VoiceRejected(Exception):
    """This voice id cannot be used with this key (not found, not permitted); the next one is tried."""


def _eleven_request(key: str, voice_id: str, role: dict, text: str, speed: float) -> bytes:
    body = json.dumps({
        "text": text, "model_id": role["model"],
        "voice_settings": {"stability": role["stab"], "similarity_boost": 0.8, "style": role["style"], "use_speaker_boost": True, "speed": speed},
    }).encode("utf-8")
    req = urllib.request.Request(f"{_API}/text-to-speech/{voice_id}?output_format=mp3_44100_64", data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code in (400, 402, 404, 422):
            raise VoiceRejected(str(e.code)) from e
        raise RuntimeError(f"speech service error {e.code}") from e
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise RuntimeError("speech service unreachable") from e


def synthesize_human(text: str, voice: str, rate: float = 1.0) -> bytes:
    """MP3 from a human voice. Raises LookupError if there is no key or no such role, RuntimeError if the service fails."""
    role_name = ALIASES.get(voice, voice)
    role, key = HUMAN.get(role_name), get_key()
    if role is None or key is None:
        raise LookupError("human voice not available")
    text = " ".join(text.split())[:MAX_CHARS]
    if not text:
        raise ValueError("empty text")
    speed = round(min(max(role["speed"] * min(max(rate, 0.5), 2.0), 0.7), 1.2), 2)
    ck = hashlib.sha256(f"{role_name}|{speed}|{text}".encode("utf-8")).hexdigest()[:32]
    out = _human_cache() / f"{ck}.mp3"
    if out.is_file():
        out.touch()
        return out.read_bytes()
    last: Exception = RuntimeError("no voice")
    for vid in role["ids"]:
        try:
            data = _eleven_request(key, vid, role, text, speed)
        except VoiceRejected as e:
            last = e
            continue
        out.write_bytes(data)
        files = sorted(_human_cache().glob("*.mp3"), key=lambda f: f.stat().st_mtime)
        for old in files[:-_HUMAN_CACHE_LIMIT]:
            old.unlink(missing_ok=True)
        return data
    raise RuntimeError(f"no usable voice ({last})")


def synthesize_audio(text: str, voice: str = "female", rate: float = 1.0) -> tuple[bytes, str]:
    """(audio bytes, media type). A human voice when a key is saved, otherwise (or if the service is down) the offline Piper voice."""
    role = HUMAN.get(ALIASES.get(voice, voice))
    if role is not None and human_available():
        try:
            return synthesize_human(text, voice, rate), "audio/mpeg"
        except (LookupError, RuntimeError):
            pass                                                         # fall through to the offline voice
    piper = role["piper"] if role else voice
    return synthesize(text, piper, rate), "audio/wav"



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
