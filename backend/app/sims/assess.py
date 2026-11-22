"""The overall score and band of a finished report, worked out the same way the report page does it (frontend/src/sims/assessment.ts), so the server can compare
a candidate with everyone else who played the same scenario.

Score = 70% decision quality + 30% the average competency rating (decision quality alone when there are no competencies), where a decision counts
100 if it was the strongest option, 55 if acceptable and 10 if weak. A scenario that ended in serious failure is capped at 59.
"""
from __future__ import annotations

import math
from typing import Any

BANDS = ((90, "outstanding", "Outstanding"), (75, "strong", "Strong"), (60, "competent", "Competent"), (40, "developing", "Developing"), (0, "not-yet", "Not yet ready"))


def _round(x: float) -> int:
    return int(math.floor(x + 0.5))                      # JavaScript's Math.round, so the page and the server agree on .5


def score_of(report: dict[str, Any]) -> int:
    s = report["summary"]
    n = max(1, s["decisions"])
    quality = _round((s["strong"] * 100 + s["mixed"] * 55 + s["weak"] * 10) / n)
    skills = report.get("skills") or []
    score = quality if not skills else _round(quality * 0.7 + _round(sum(x["percent"] for x in skills) / len(skills)) * 0.3)
    if (report.get("outcome") or {}).get("tone") == "bad":
        score = min(score, 59)
    return max(0, min(100, score))


def band_of(score: int) -> tuple[str, str]:
    for lo, key, label in BANDS:
        if score >= lo:
            return key, label
    return BANDS[-1][1], BANDS[-1][2]
