# Stakeholders and optional AI dialogue

## What a stakeholder is

Five non-player characters, each a deterministic policy (`backend/app/stakeholders/agents.py`):

| Agent | Cares about | Hard constraint (veto) | Imperfect / private information |
|---|---|---|---|
| Kavya Rao, Safety Chief | Staff safety, procedure | Won't back restricted operations on an uncleared site | Warns privately about an unassessed hazard |
| Arjun Mehta, IT Lead | Containment, evidence | Won't back restoring without containment | Says what the logs show, never who did it; confidence drops with poor evidence |
| Nisha Sen, Finance Director | Keeping budget in reserve | Won't back a package that leaves < ₹1.5 lakh for contingencies | Knows committed obligations exactly (invoices, penalties) |
| Raghav Verma, Logistics | Capacity, time on the clock | none | **Optimistic**: quotes capacity 25 units high while the depot is unconfirmed, and says so |
| Dr. Isha Kapoor, Hospital Liaison | Hospital deliveries first | Won't put a contract ahead of patients | Reports hospital urgency; can't promise stock that isn't verified |

All five share one constraint: **none will recommend skipping emergency procedure.**

## How advice is produced

1. For each available choice the engine does a **dry run** (`engine.preview`): what would this change?
2. The agent scores that change with its own weights and flags, applies its vetoes, and ranks the options.
3. Output: a recommendation (or "no strong view" when options barely differ), a verdict per option
   (`support` / `caution` / `oppose` / `neutral`) with reasons, a confidence percentage, the public facts it used,
   its own claims (each marked verified or not), and a reaction to the player's last decision judged with the
   information available *then*.
4. Dialogue is composed from templates, with variation chosen by a seeded hash (same situation, same words).

Asking is read-only: it never changes the world, costs no time, and is stored per run/round so a refresh or a
second ask returns the same answer. A rewound branch gets fresh advice.

Advisors never see the hidden true stock level, and (tested) their output never contains it.

## Optional language-model phrasing

With no key configured, everything above works and dialogue is rule-based. If a key is set, the model may
**rephrase** the finished advice; it cannot change it.

| Variable | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` or `REALITYLAB_LLM_KEY` | Enables the model |
| `REALITYLAB_LLM_MODEL` | Default `claude-haiku-5-5` |
| `REALITYLAB_LLM_TIMEOUT` | Seconds, default 8 |
| `REALITYLAB_LLM_URL` | Messages-API endpoint (default Anthropic) |
| `REALITYLAB_LLM=off` | Disable even if a key is present |

What the model receives: the character's persona, the structured advice, public facts, the agent's own claims,
and the deterministic draft. **Nothing else** (no raw state, no hidden values, no other characters).

What it must return: exactly `{"dialogue": "..."}`. The reply is rejected, and the deterministic text used,
if it: is not that JSON; is outside 20–420 characters; contains markup, URLs or code characters; makes an
attribution claim ("hacked by…", "proven"); or uses **any number that was not in the input**. Any network error,
timeout or bad status also falls back. The response says which happened (`source: "policy"`,
`note: "llm_rejected:invented_number:777"`), and the UI labels advice "AI-phrased" or "Rule-based".

Only stakeholder advice uses the model. Comic page dialogue stays fixed content.

## API

`POST /api/simulations/{id}/stakeholder-advice` body `{"stakeholder": "kavya|arjun|nisha|raghav|isha"}`
→ advice object. `GET` the same path lists advice already given for the current decision.
`409` if the run is paused (dead end) or finished; `422` for an unknown stakeholder.
