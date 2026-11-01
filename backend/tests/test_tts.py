import struct
import wave

import pytest
from fastapi.testclient import TestClient

from app.factory import create_app
from app.sims import tts


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("REALITYLAB_DB", f"sqlite:///{tmp_path / 'x.db'}")
    monkeypatch.delenv("REALITYLAB_VOICE_DIR", raising=False)
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    return TestClient(create_app())


def test_without_voice_files_the_app_reports_none_and_refuses_politely(client):
    st = client.get("/api/tts/status").json()
    assert st["voices"] == [] and st["human"] is False and "narrator" in st["roles"]
    assert client.post("/api/tts", json={"text": "Hello."}).status_code == 404


def test_input_is_validated(client):
    assert client.post("/api/tts", json={"text": ""}).status_code == 422
    assert client.post("/api/tts", json={"text": "x" * 5000}).status_code == 422
    assert client.post("/api/tts", json={"text": "Hi", "voice": "robot"}).status_code == 422
    assert client.post("/api/tts", json={"text": "Hi", "rate": 9}).status_code == 422


def test_with_voice_files_the_engine_is_called_and_a_wav_comes_back(client, tmp_path, monkeypatch):
    d = tmp_path / "voice"
    (d / "piper").mkdir(parents=True)
    (d / "piper" / "piper.exe").write_bytes(b"")
    for v in tts.VOICES.values():
        (d / f"{v}.onnx").write_bytes(b""); (d / f"{v}.onnx.json").write_bytes(b"{}")
    monkeypatch.setenv("REALITYLAB_VOICE_DIR", str(d))
    monkeypatch.setattr(tts, "_cache_dir", lambda: tmp_path / "cache")
    (tmp_path / "cache").mkdir()
    seen = {}

    class R:
        returncode = 0

    def fake_run(cmd, input, **kw):
        seen["cmd"], seen["text"] = cmd, input.decode()
        out = cmd[cmd.index("--output_file") + 1]
        with wave.open(out, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
            w.writeframes(struct.pack("<100h", *range(100)))
        return R()

    monkeypatch.setattr(tts.subprocess, "run", fake_run)
    assert client.get("/api/tts/status").json()["voices"] == ["female", "male", "heroic", "hindi"]
    r = client.post("/api/tts", json={"text": "Hello   there.", "voice": "male", "rate": 0.5})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav" and r.content[:4] == b"RIFF"
    assert "alan" in seen["cmd"][seen["cmd"].index("--model") + 1]
    assert seen["cmd"][seen["cmd"].index("--length_scale") + 1] == "2.000"        # half speed = twice as long
    assert seen["text"] == "Hello there."
    seen.clear()
    assert client.post("/api/tts", json={"text": "Hello   there.", "voice": "male", "rate": 0.5}).status_code == 200
    assert seen == {}                                                              # second request is served from the cache
    r = client.post("/api/tts", json={"text": "नमस्ते।", "voice": "hindi"})
    assert r.status_code == 200 and "pratham" in seen["cmd"][seen["cmd"].index("--model") + 1] and seen["text"] == "नमस्ते।"


# ----------------------------------------------------------------------------------------------- human voices (ElevenLabs), no network
def test_saving_and_forgetting_a_key_enables_the_human_voices(client, monkeypatch):
    monkeypatch.setattr(tts, "check_key", lambda k: k.startswith("sk_good"))
    assert client.put("/api/tts/key", json={"key": "sk_bad_0000000000000000"}).status_code == 400
    assert client.get("/api/tts/status").json()["human"] is False
    assert client.put("/api/tts/key", json={"key": "sk_good_0000000000000000"}).json() == {"human": True}
    assert client.get("/api/tts/status").json()["human"] is True
    assert client.put("/api/tts/key", json={"key": "has spaces and <markup>"}).status_code == 422
    assert client.delete("/api/tts/key").json() == {"human": False}


def test_a_role_speaks_with_its_voice_and_is_cached(client, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "sk_env_0000000000000000")
    calls = []

    def fake(key, voice_id, role, text, speed):
        calls.append((voice_id, role["model"], speed, text))
        return b"ID3-fake-mp3"

    monkeypatch.setattr(tts, "_eleven_request", fake)
    r = client.post("/api/tts", json={"text": "Day three.   Admissions doubled.", "voice": "narrator", "rate": 1.0})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/mpeg" and r.content == b"ID3-fake-mp3"
    assert calls[0][0] == tts.OG_VEE and calls[0][3] == "Day three. Admissions doubled." and calls[0][2] == 0.9    # the tired narrator speaks slower
    client.post("/api/tts", json={"text": "Day three.   Admissions doubled.", "voice": "narrator", "rate": 1.0})
    assert len(calls) == 1                                                                                          # the repeat comes from the disk cache
    client.post("/api/tts", json={"text": "Hello.", "voice": "female"})
    assert calls[-1][0] == tts.ALICE                                                                                # the old "female" voice is now a human reader


def test_a_voice_this_account_cannot_use_falls_through_to_the_next(client, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "sk_env_0000000000000000")
    tried = []

    def fake(key, voice_id, role, text, speed):
        tried.append(voice_id)
        if voice_id == tts.ARKADIUS:
            raise tts.VoiceRejected("404")
        return b"mp3"

    monkeypatch.setattr(tts, "_eleven_request", fake)
    assert client.post("/api/tts", json={"text": "Once upon a ledger.", "voice": "librarian"}).status_code == 200
    assert tried == [tts.ARKADIUS, tts.KEITH]


def test_if_the_human_service_is_down_the_offline_voice_is_used(client, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "sk_env_0000000000000000")
    monkeypatch.setattr(tts, "_eleven_request", lambda *a: (_ for _ in ()).throw(RuntimeError("down")))
    seen = {}
    monkeypatch.setattr(tts, "synthesize", lambda text, voice, rate: seen.setdefault("v", voice) and b"RIFFwav")
    r = client.post("/api/tts", json={"text": "Hi there.", "voice": "char_kavya"})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav" and seen["v"] == "female"
