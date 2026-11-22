"""Employer accounts: an employer or institution signs in, adds the verification codes candidates give them, and keeps a shortlist that can be compared side by side.

Passwords are stored as PBKDF2-HMAC-SHA256 hashes with a per-account salt. A sign-in is a random token; only its SHA-256 hash is stored, so a copy of the database
cannot be used to sign in. Adding a candidate runs the same verification anyone can run, so the shortlist can only hold reports that really are genuine.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from ..services.simulations import BadRequest, NotFound
from .assess import band_of, score_of
from .models import AuthSession, Employer, ShortlistEntry, SimRun
from .service import SimsService
from .verify import benchmark

ITERATIONS = 200_000
SESSION_DAYS = 14
EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,}$")


class Unauthorized(Exception):
    pass


class RateLimited(Exception):
    pass


class Limiter:
    """A small in-memory limit per client and action (sign-in, sign-up, verification), so codes and passwords cannot be guessed in bulk."""
    def __init__(self, limit: int = 30, window: float = 60.0) -> None:
        self.limit, self.window, self.hits = limit, window, defaultdict(deque)

    def check(self, key: str) -> None:
        now, q = time.monotonic(), self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            raise RateLimited("Too many attempts. Wait a minute and try again.")
        q.append(now)


def hash_password(pw: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    return f"pbkdf2${ITERATIONS}${salt.hex()}${hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), salt, ITERATIONS).hex()}"


def check_password(pw: str, stored: str) -> bool:
    try:
        _, it, salt, digest = stored.split("$")
        got = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), bytes.fromhex(salt), int(it)).hex()
        return hmac.compare_digest(got, digest)
    except (ValueError, TypeError):
        return False


def _th(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class EmployerService:
    def __init__(self, sims: SimsService) -> None:
        self.sims, self.sf = sims, sims.sf

    # ------------------------------------------------------------------ accounts
    def register(self, email: str, password: str, org: str) -> dict[str, Any]:
        email = email.strip().lower()
        if not EMAIL.match(email):
            raise BadRequest("Enter a valid email address.")
        if len(password) < 8:
            raise BadRequest("Use a password of at least 8 characters.")
        with self.sf() as db:
            if db.scalars(select(Employer).where(Employer.email == email)).first():
                raise BadRequest("There is already an account with that email. Sign in instead.")
            emp = Employer(id=uuid.uuid4().hex[:16], email=email, org=" ".join(org.split())[:80], pw_hash=hash_password(password))
            db.add(emp); db.commit()
            return self._issue(db, emp)

    def login(self, email: str, password: str) -> dict[str, Any]:
        with self.sf() as db:
            emp = db.scalars(select(Employer).where(Employer.email == email.strip().lower())).first()
            if emp is None or not check_password(password, emp.pw_hash):
                raise Unauthorized("That email and password do not match.")
            return self._issue(db, emp)

    def _issue(self, db, emp: Employer) -> dict[str, Any]:
        token = secrets.token_urlsafe(32)
        db.add(AuthSession(token_hash=_th(token), employer_id=emp.id, expires_at=_now() + timedelta(days=SESSION_DAYS)))
        db.commit()
        return {"token": token, "employer": {"id": emp.id, "email": emp.email, "org": emp.org}}

    def logout(self, token: str) -> None:
        with self.sf() as db:
            row = db.get(AuthSession, _th(token))
            if row:
                db.delete(row); db.commit()

    def authenticate(self, token: str | None) -> Employer:
        if not token:
            raise Unauthorized("Sign in to continue.")
        with self.sf() as db:
            row = db.get(AuthSession, _th(token))
            exp = row.expires_at.replace(tzinfo=timezone.utc) if row and row.expires_at.tzinfo is None else (row.expires_at if row else None)
            if row is None or exp < _now():
                raise Unauthorized("Your sign-in has expired. Sign in again.")
            emp = db.get(Employer, row.employer_id)
            if emp is None:
                raise Unauthorized("Sign in to continue.")
            return emp

    # ------------------------------------------------------------------ shortlist
    def _view(self, e: ShortlistEntry) -> dict[str, Any]:
        key, label = band_of(e.score)
        return {"id": e.id, "code": e.code, "candidate": e.candidate, "simulation": e.simulation, "sim_id": e.sim_id, "score": e.score, "band": key, "band_label": label,
                "skills": e.skills, "note": e.note, "added_at": e.added_at.isoformat()}

    def shortlist(self, emp: Employer) -> list[dict[str, Any]]:
        with self.sf() as db:
            rows = db.scalars(select(ShortlistEntry).where(ShortlistEntry.employer_id == emp.id)).all()
            return sorted((self._view(r) for r in rows), key=lambda v: -v["score"])

    def add_candidate(self, emp: Employer, code: str) -> dict[str, Any]:
        v = self.sims.verify_code(code)
        if not v["valid"]:
            raise BadRequest(v["reason"])
        with self.sf() as db:
            for e in db.scalars(select(ShortlistEntry).where(ShortlistEntry.employer_id == emp.id)).all():
                if e.code.lower() == v["code"].lower():
                    return self._view(e)                                          # already there
            rep = v["report"]
            e = ShortlistEntry(id=uuid.uuid4().hex[:16], employer_id=emp.id, code=v["code"], candidate=v["candidate"], simulation=rep["simulation"], sim_id=rep["simulation_id"],
                               score=v["score"], band=v["band"], skills=[{"id": x["id"], "label": x["label"], "percent": x["percent"]} for x in rep.get("skills", [])])
            db.add(e); db.commit()
            return self._view(e)

    def set_note(self, emp: Employer, entry_id: str, note: str) -> dict[str, Any]:
        with self.sf() as db:
            e = db.get(ShortlistEntry, entry_id)
            if e is None or e.employer_id != emp.id:
                raise NotFound("That candidate is not on your shortlist.")
            e.note = " ".join(note.split())[:400]; db.commit()
            return self._view(e)

    def remove(self, emp: Employer, entry_id: str) -> None:
        with self.sf() as db:
            e = db.get(ShortlistEntry, entry_id)
            if e is None or e.employer_id != emp.id:
                raise NotFound("That candidate is not on your shortlist.")
            db.delete(e); db.commit()

    # ------------------------------------------------------------------ analytics
    def analytics(self, sim_id: str) -> dict[str, Any]:
        """Anonymous figures for one scenario: how many finished attempts, the average score, how the scores are spread, and how often each choice was strongest."""
        with self.sf() as db:
            runs = [r for r in db.scalars(select(SimRun).where(SimRun.sim_id == sim_id, SimRun.status == "completed")).all() if r.report]
        scores = [score_of(r.report) for r in runs]
        buckets = [0] * 5                                                           # 0-19, 20-39, 40-59, 60-79, 80-100
        for s in scores:
            buckets[min(4, s // 20)] += 1
        steps: dict[str, dict[str, int]] = {}
        for r in runs:
            for d in r.report.get("major_decisions", []):
                st = steps.setdefault(d["step"], {"strong": 0, "mixed": 0, "weak": 0})
                st[d["rating"]] += 1
        return {"sim_id": sim_id, "attempts": len(scores), "mean": round(sum(scores) / len(scores)) if scores else None,
                "distribution": [{"from": i * 20, "to": i * 20 + 19 if i < 4 else 100, "count": c} for i, c in enumerate(buckets)],
                "steps": [{"step": k, **v, "total": sum(v.values()), "strong_rate": round(100 * v["strong"] / sum(v.values()))} for k, v in steps.items()]}


# ---------------------------------------------------------------------- HTTP
router = APIRouter(prefix="/api")
limiter = Limiter()


def esvc(request: Request) -> EmployerService:
    return request.app.state.employers


def _limit(request: Request, action: str) -> None:
    limiter_ = request.app.state.limiter
    limiter_.check(f"{action}:{request.client.host if request.client else '?'}")


def current(request: Request, authorization: str | None = Header(None)) -> Employer:
    token = authorization[7:] if authorization and authorization.lower().startswith("bearer ") else None
    return request.app.state.employers.authenticate(token)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=1, max_length=200)
    org: str = Field("", max_length=80)


class CodeBody(BaseModel):
    code: str = Field(min_length=3, max_length=40)


class NoteBody(BaseModel):
    note: str = Field("", max_length=400)


@router.post("/employers/register", summary="Create an employer account and sign in")
def register(body: Credentials, request: Request, s: EmployerService = Depends(esvc)):
    _limit(request, "register")
    return s.register(body.email, body.password, body.org)


@router.post("/employers/login", summary="Sign in; returns a bearer token")
def login(body: Credentials, request: Request, s: EmployerService = Depends(esvc)):
    _limit(request, "login")
    return s.login(body.email, body.password)


@router.post("/employers/logout")
def logout(authorization: str | None = Header(None), s: EmployerService = Depends(esvc)):
    if authorization and authorization.lower().startswith("bearer "):
        s.logout(authorization[7:])
    return {"ok": True}


@router.get("/employers/me")
def me(emp: Employer = Depends(current)):
    return {"id": emp.id, "email": emp.email, "org": emp.org}


@router.get("/employers/shortlist", summary="Verified candidates this employer saved, best score first")
def get_shortlist(emp: Employer = Depends(current), s: EmployerService = Depends(esvc)):
    return s.shortlist(emp)


@router.post("/employers/shortlist", summary="Verify a candidate's code and add the report to the shortlist")
def add_candidate(body: CodeBody, request: Request, emp: Employer = Depends(current), s: EmployerService = Depends(esvc)):
    _limit(request, "verify")
    return s.add_candidate(emp, body.code)


@router.put("/employers/shortlist/{entry_id}/note")
def put_note(entry_id: str, body: NoteBody, emp: Employer = Depends(current), s: EmployerService = Depends(esvc)):
    return s.set_note(emp, entry_id, body.note)


@router.delete("/employers/shortlist/{entry_id}")
def delete_candidate(entry_id: str, emp: Employer = Depends(current), s: EmployerService = Depends(esvc)):
    s.remove(emp, entry_id)
    return {"ok": True}


@router.get("/analytics/{sim_id}", summary="Anonymous figures for one scenario")
def analytics(sim_id: str, s: EmployerService = Depends(esvc)):
    return s.analytics(sim_id)
