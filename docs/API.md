# BLACKOUT API

Base URL (local): `http://localhost:8000`. Interactive docs: `/docs` (Swagger) and `/openapi.json`.

Start the server from `backend/`:

```powershell
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

If the frontend has been built (`npm run build` in `frontend`), the same server also serves the game at `/`; set
`REALITYLAB_FRONTEND=off` to disable that, or `REALITYLAB_FRONTEND=<folder>` to serve a different build.

The database is `backend/data/realitylab.db` (override with the `REALITYLAB_DB` environment variable,
e.g. `sqlite:///C:/path/to/file.db`).

## Concepts

- A **simulation** is a family of **runs**. A run is one playthrough/branch. Rewinding or replaying
  never edits a run; it creates a child run, so a failed attempt stays reviewable.
- A **checkpoint** is the state *before* decision `index`. Checkpoint `0` is the very start.
- Run `status`: `active`, `dead_end` (paused), `completed`, `superseded` (replaced by a rewind/restart).
- The server is authoritative. Every response includes the full `state` and `scene` the UI needs, so a
  page refresh is just `GET /api/simulations/{id}`.
- Hidden ground truth (the real stock level) and the planner's winning plan are never returned during play, including inside recorded event changes. The finished-run report reveals the true stock once the run is over.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/simulations` | Create. Body: `{"seed"?: int, "max_rewinds"?: 0-20}` → `201` view |
| GET | `/api/simulations/{id}?run_id=` | Current state, scene, risks, dead-end analysis (if paused) |
| POST | `/api/simulations/{id}/decisions` | Body: `{"choice_id": "r1_isolate"}` → view + `outcome` |
| GET | `/api/simulations/{id}/history?run_id=` | Decisions (with what was known at the time) and events |
| GET | `/api/simulations/{id}/timeline` | All runs, branch links and per-run metrics |
| POST | `/api/simulations/{id}/rewind` | Optional body `{"checkpoint_index": n}`. Default: last recoverable checkpoint. Consumes one rewind |
| POST | `/api/simulations/{id}/continue` | Continue a *soft* dead end, accepting a degraded outcome |
| POST | `/api/simulations/{id}/restart` | New run from the start, same seed. Free |
| POST | `/api/simulations/{id}/replay` | Counterfactual. Body: `{"checkpoint_index", "choices": [...], "follow_original"?: bool}`. Active run unchanged, no rewind consumed |
| POST | `/api/simulations/{id}/stakeholder-advice` | Body `{"stakeholder": "kavya\|arjun\|nisha\|raghav\|isha"}`. Read-only advice for the current decision (see `docs/STAKEHOLDERS.md`) |
| GET | `/api/simulations/{id}/stakeholder-advice` | Advice already given for the current decision |
| GET | `/api/simulations/{id}/report?run_id=` | Final performance report for a finished run: overall score, 8 category scores with formulas and inputs, every decision rated by what was known, avoidable and unavoidable losses, missed opportunities, recommended alternatives, progress across attempts, and the post-game reveal of the true stock. `409` until the run is finished. Cached; see `docs/SCORING.md` |
| GET | `/api/simulations/{id}/compare?base=&other=` | Side-by-side comparison of two runs (defaults: newest run against the run it branched from): delivery, budget, safety, system recovery, inventory confidence, trust, time left, critical events, ending, score, an aligned timeline and readiness trajectory |
| GET | `/api/simulations/{id}/checkpoints/{index}?run_id=` | A past decision as it stood: what was known and which options existed (powers the "try a different decision" flow) |
| GET | `/api/health` | Liveness |


## Errors

Every error uses one shape:

```json
{"error": {"code": "conflict", "message": "…", "details": [{"field": "choice_id", "message": "…"}]}}
```

| Status | `code` | Meaning |
|---|---|---|
| 404 | `not_found` | Unknown simulation or run |
| 409 | `conflict` | Action not allowed in the current state (run paused/finished, rewind limit, nothing to rewind) |
| 422 | `validation_error` | Malformed request (wrong type, unknown field, bad choice id format, out-of-range index) |
| 422 | `invalid_request` | Well-formed but not playable now (wrong round, unaffordable, safety restriction, unknown checkpoint) |
| 500 | `internal_error` | Unexpected; nothing is written (each call is one transaction) |

## Example session (PowerShell)

```powershell
$base = "http://localhost:8000/api/simulations"
$sim = Invoke-RestMethod -Method Post $base -ContentType application/json -Body '{"seed":1}'
$id = $sim.simulation.id
$sim.scene.choices | Select-Object id, label, available

Invoke-RestMethod -Method Post "$base/$id/decisions" -ContentType application/json -Body '{"choice_id":"r1_isolate"}'
Invoke-RestMethod -Method Post "$base/$id/decisions" -ContentType application/json -Body '{"choice_id":"r2_maintain"}'  # dead end
Invoke-RestMethod -Method Post "$base/$id/rewind"                                                                    # back to round 2
```

## The view object

```
simulation   id, seed, active_run_id, rewinds_used / max_rewinds / rewinds_left
run          id, kind (main|rewind|replay|restart), attempt, status, parent_run_id,
             branch_checkpoint_index, accepted_risk, ending
state        player-visible world state (budget, window_min, system_integrity, …, flags, decisions, events)
scene        round, clock, title, brief, environment, characters, effects, info[], events[], choices[]
             choices[]: id, label, summary, cost, time_cost, confirm, available, reason
             (when completed: scene.final holds shipped units, deadline_met, ending text)
risks        active risks derived from the state
analysis     null unless status == "dead_end" (see below)
checkpoints  [{index, round, clock, inherited}]
```

`analysis` (dead end): `title`, `severity` (`soft`|`hard`), `continue_allowed`, `what_happened[]`,
`why_unrecoverable[]`, `contributing_decisions[]` (each with `known_at_time`, `viable_alternatives`,
`effects`, `risks_created`, `consequences`, `chance_events_after`), `critical_point`,
`last_recoverable_checkpoint`, `risks_not_addressed[]`, `projection`.

## Dead-end rules (summary)

The objective is to ship the hospitals' full combined need. A run is a dead end only when an
exhaustive search of the real rules proves no sequence of available choices achieves it. *Soft*: a
partial dispatch is still reachable (continuing is allowed). *Hard*: nothing acceptable remains.
Poor metrics, heavy spending or a missed deadline alone never trigger it. If the search exceeds its
node budget the result is "unknown" and play continues.
