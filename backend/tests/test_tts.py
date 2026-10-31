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
    return TestClient(create_app())


def test_without_voice_files_the_app_reports_none_and_refuses_politely(client):
    assert client.get("/api/tts/status").json() == {"voices": []}
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
    assert client.get("/api/tts/status").json() == {"voices": ["female", "male"]}
    r = client.post("/api/tts", json={"text": "Hello   there.", "voice": "male", "rate": 0.5})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav" and r.content[:4] == b"RIFF"
    assert "ryan" in seen["cmd"][seen["cmd"].index("--model") + 1]
    assert seen["cmd"][seen["cmd"].index("--length_scale") + 1] == "2.000"        # half speed = twice as long
    assert seen["text"] == "Hello there."
    seen.clear()
    assert client.post("/api/tts", json={"text": "Hello   there.", "voice": "male", "rate": 0.5}).status_code == 200
    assert seen == {}                                                              # second request is served from the cache
