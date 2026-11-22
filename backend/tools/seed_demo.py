"""Fills a demo database through the running API: candidates play scenarios with different levels of skill, seal their reports, and a demo employer account
shortlists some of them. Run the server on a *separate* database (see scripts/run-demo.cmd) first; this never touches your own runs.

  python tools/seed_demo.py [http://127.0.0.1:8000]
"""
import random
import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
EMPLOYER = ("demo@realitylab.test", "demo-password-1", "Demo Hiring Co")
CANDIDATES = [("Asha Rao", 0.9), ("Ben Cole", 0.55), ("Chitra Nair", 0.75), ("Dev Malhotra", 0.35), ("Esha Kapoor", 0.8), ("Farid Khan", 0.6), ("Gita Iyer", 0.95), ("Hari Menon", 0.45)]
SIMS = ["surgery", "circuit", "covid_workday", "bhopal_workday"]


def play(c: httpx.Client, sim: str, skill: float, rng: random.Random) -> str:
    v = c.post(f"/api/sims/{sim}/runs").json()
    run = v["run"]["id"]
    while v["run"]["status"] == "active":
        choices = v["scene"]["step"]["choices"]
        want = "strong" if rng.random() < skill else rng.choice(["mixed", "weak"])
        pick = next((x for x in choices if x["id"].endswith("_" + want)), None) or next((x for x in choices if x["id"].endswith("_strong")), choices[0])
        v = c.post(f"/api/runs/{run}/decisions", json={"choice_id": pick["id"]}).json()["view"]
    return run


def main() -> None:
    rng = random.Random(2026)
    codes: list[tuple[str, str]] = []
    with httpx.Client(base_url=BASE, timeout=30) as c:
        for name, skill in CANDIDATES:
            for sim in SIMS[:2] if skill < 0.7 else SIMS:
                run = play(c, sim, skill, rng)
                r = c.post(f"/api/runs/{run}/seal", json={"candidate": name})
                r.raise_for_status()
                codes.append((name, r.json()["code"]))
        r = c.post("/api/employers/register", json={"email": EMPLOYER[0], "password": EMPLOYER[1], "org": EMPLOYER[2]})
        if r.status_code != 200:
            r = c.post("/api/employers/login", json={"email": EMPLOYER[0], "password": EMPLOYER[1]})
        h = {"authorization": "Bearer " + r.json()["token"]}
        for name, code in codes[:12]:
            c.post("/api/employers/shortlist", json={"code": code}, headers=h)
    print(f"Seeded {len(codes)} sealed reports for {len(CANDIDATES)} candidates.")
    print(f"Employer sign-in: {EMPLOYER[0]} / {EMPLOYER[1]}")
    print("Example codes to verify:", ", ".join(code for _, code in codes[:3]))


if __name__ == "__main__":
    main()
