"""Verifiable reports: a finished report can be sealed, and anyone holding its code can check that it is genuine and unchanged.

A seal is a short code, `RL-<first 8 of the run id>-<8 hex of a signature>`. The signature is an HMAC-SHA256 over the report's content, the candidate's name and the
date it was issued, made with a secret key that stays on the server (`report-signing.key` next to the database, or $REALITYLAB_SEAL_KEY). Checking a code
looks up the run, rebuilds the signature from what is stored now and compares it in constant time. If a single decision, score or name were edited the code no
longer matches, and a code made up from nothing never matches. The signature covers everything a hiring manager reads; it says nothing about whether the
simulation was played honestly or by whom, and the report says so.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from ..services.simulations import BadRequest, Conflict, NotFound
from . import tts
from .assess import band_of, score_of
from .models import SimRun

CODE = re.compile(r"^RL-([0-9a-f]{8})-([0-9a-f]{8})$", re.I)
SIG_LEN = 8


def _key() -> bytes:
    env = os.environ.get("REALITYLAB_SEAL_KEY", "")
    if env:
        return env.encode("utf-8")
    f: Path = tts.data_dir() / "report-signing.key"
    try:
        if f.exists():
            return f.read_bytes()
        f.parent.mkdir(parents=True, exist_ok=True)
        k = secrets.token_hex(32).encode("ascii")
        f.write_bytes(k)
        return k
    except OSError:                                         # a read-only folder: a key that lasts for this run only, so seals still work but are not kept
        return _KEY_FALLBACK


_KEY_FALLBACK = secrets.token_hex(32).encode("ascii")


def _signature(report: dict[str, Any], candidate: str, issued_at: str) -> str:
    body = {k: v for k, v in report.items() if k != "seal"}
    blob = json.dumps({"report": body, "candidate": candidate, "issued_at": issued_at}, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hmac.new(_key(), blob, hashlib.sha256).hexdigest()[:SIG_LEN]


def code_for(run_id: str, report: dict[str, Any], candidate: str, issued_at: str) -> str:
    return f"RL-{run_id[:8].lower()}-{_signature(report, candidate, issued_at)}"


MIN_BENCH = 5


def benchmark(db, sim_id: str, score: int, exclude_run: str | None = None) -> dict[str, Any]:
    """How this score compares with every other finished attempt at the same scenario on this server. Not given until at least MIN_BENCH others have played."""
    others = [score_of(r.report) for r in db.scalars(select(SimRun).where(SimRun.sim_id == sim_id, SimRun.status == "completed")).all()
              if r.report and r.id != exclude_run]
    n = len(others)
    if n < MIN_BENCH:
        return {"n": n, "percentile": None, "mean": round(sum(others) / n) if n else None}
    return {"n": n, "percentile": round(100 * sum(1 for x in others if x < score) / n), "mean": round(sum(others) / n)}


class VerifyMixin:
    def seal_report(self, run_id: str, candidate: str) -> dict[str, Any]:
        """Seal (or re-read the seal of) a finished report. A report is sealed once: the first name and date are the ones that count."""
        name = " ".join(candidate.split())[:60]
        if not name:
            raise BadRequest("Add your name in Settings before sealing a report.")
        with self.sf() as db:
            run = self._run(db, run_id)
            if run.report is None:
                raise Conflict("A report can be sealed once the simulation is finished.")
            seal = run.report.get("seal")
            if seal:
                return seal
            issued = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
            rep = dict(run.report)
            rep["seal"] = {"code": code_for(run.id, run.report, name, issued), "candidate": name, "issued_at": issued}
            run.report = rep                                  # a new dict, so the JSON column is saved
            db.commit()
            return rep["seal"]

    def verify_code(self, code: str) -> dict[str, Any]:
        """Is this code genuine, and for which report? Never raises for a wrong code: the answer is `valid: false`."""
        c = CODE.match((code or "").strip())
        if not c:
            return {"valid": False, "reason": "That is not a RealityLab report code. It looks like RL-0123abcd-4567ef89."}
        prefix, sig = c.group(1).lower(), c.group(2).lower()
        with self.sf() as db:
            runs = db.scalars(select(SimRun).where(SimRun.id.like(f"{prefix}%"), SimRun.status == "completed")).all()
            for run in runs:
                seal = (run.report or {}).get("seal")
                if not seal:
                    continue
                good = _signature(run.report, seal["candidate"], seal["issued_at"])
                if hmac.compare_digest(good, sig) and hmac.compare_digest(seal["code"].lower(), code.strip().lower()):
                    score = score_of(run.report); key, label = band_of(score)
                    return {"valid": True, "candidate": seal["candidate"], "issued_at": seal["issued_at"], "code": seal["code"], "report": {k: v for k, v in run.report.items() if k != "seal"},
                            "score": score, "band": key, "band_label": label, "benchmark": benchmark(db, run.sim_id, score, run.id)}
            tampered = any((r.report or {}).get("seal") for r in runs)
        return {"valid": False, "reason": ("This code does not match the report on record. The report may have been changed, or the code was copied wrongly." if tampered
                                           else "No sealed report with that code was found on this server.")}
