from fastapi.testclient import TestClient

from app.factory import find_frontend
from app.factory import create_app
from app.stakeholders.llm import Voice


def build(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<html><body>BLACKOUT game</body></html>", encoding="utf8")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)", encoding="utf8")
    return tmp_path


def test_built_frontend_is_served_next_to_the_api(tmp_path):
    with TestClient(create_app("sqlite://", Voice(None), frontend_dir=build(tmp_path))) as c:
        assert "BLACKOUT game" in c.get("/").text
        assert c.get("/assets/app.js").status_code == 200
        assert c.get("/api/health").json() == {"status": "ok"}              # API routes win over the static mount
        sim = c.post("/api/simulations", json={"seed": 1})
        assert sim.status_code == 201 and sim.json()["scene"]["round"] == 1
        assert c.get("/api/simulations/nope").json()["error"]["code"] == "not_found"


def test_serving_is_off_by_default_and_when_nothing_is_built(tmp_path):
    with TestClient(create_app("sqlite://", Voice(None))) as c:
        assert c.get("/").status_code == 404
    assert find_frontend(tmp_path) is None                                  # directory without index.html
    assert find_frontend(None) is None


def test_auto_mode_honours_the_environment(tmp_path, monkeypatch):
    built = build(tmp_path)
    monkeypatch.setenv("REALITYLAB_FRONTEND", str(built))
    assert find_frontend("auto") == built
    monkeypatch.setenv("REALITYLAB_FRONTEND", "off")
    assert find_frontend("auto") is None
