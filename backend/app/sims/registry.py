"""Every playable scenario, by id. A profession (blackout, bhopal, covid) has an ordinary-day workday and a crisis; BLACKOUT's crisis keeps its own engine."""
from __future__ import annotations

from .bhopal import BHOPAL
from .covid import COVID
from .workdays import WORKDAYS

SCENARIOS = {"bhopal": BHOPAL, "covid": COVID, **{f"{p}_workday": w for p, w in WORKDAYS.items()}}
PROFESSIONS = ("blackout", "bhopal", "covid")
BLACKOUT_META = {
    "id": "blackout", "title": "BLACKOUT: The NotPetya Incident", "tagline": "Lead a terminal through the first ten days of a cyberattack.",
    "role": "Recovery lead at a container terminal", "domain": "Operations · Cybersecurity · Crisis leadership", "minutes": 35,
    "description": "Ten rounds based on the documented 2017 NotPetya attack on Maersk, with reconstructed scenes and simulated decisions, told as a comic.",
    "objectives": ["Decide under pressure with incomplete, changing information.", "Balance safety, customers, evidence and speed.",
                   "Communicate honestly with staff, customers and the public."],
    "style": "comic",
}
