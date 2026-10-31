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
BLACKOUT_INTERVAL = (
    "Tuesday 27 June 2017. The routine update that was queued yesterday runs in the morning, like any other. Nobody notices.",
    "A little before eleven, a PC at the gate shows a red message. Then another one, across the yard. Within minutes the Terminal Supervisor is on the radio, and the IT Lead is walking fast toward your office.",
    "You look at the room. The five people you briefed on Monday morning. The servers you patched, or did not. The backup you restored, or did not. Whatever you did on that ordinary Monday is what you have now.",
)
