# Testing

| Suite | Command | Needs |
|---|---|---|
| Backend (engine, planner, persistence, API, stakeholders, scoring, acceptance, soak) | `cd backend` then `.venv\Scripts\python -m pytest -q` | nothing running; uses in-memory SQLite (and one temp file for restart tests) |
| Frontend (renderer, components, app flows) | `cd frontend` then `npm test` | nothing running; the API is faked from **real backend responses** (`src/fixtures/views.json`) |
| Longer soak (random players) | `$env:SOAK_RUNS=60; .venv\Scripts\python -m pytest -q tests\test_soak.py` | about 6 minutes |
| Type check / build | `cd frontend` then `npm run build` | |

Counts at the time of writing: backend 249 tests (incl. 6 soak players), frontend 82 tests. The backend suite takes roughly 1–2 minutes; creating
SQLite files is slow on some Windows machines (antivirus scanning), which is why almost all tests use an in-memory database.

Fixtures are regenerated from the live backend with `backend\.venv\Scripts\python backend\tools\dump_fixtures.py`.
`docs\RULES.md` and `docs\SCORING.md` are regenerated from the scenario/rubric code by `tools\gen_rules_doc.py` and
`tools\gen_scoring_doc.py`.

## Definition of done: one test each

`backend/tests/test_acceptance.py` drives the public HTTP API of a freshly built app:

| # | Requirement | Test |
|---|---|---|
| 1 | Start a new simulation | `test_01_start_a_new_simulation` |
| 2 | Comic story (backend half: every scene ships a valid page) | `test_02_every_scene_ships_a_valid_comic_page`; renderer: `src/comic/comic.test.tsx` |
| 3 | Decisions update persistent state | `test_03_decisions_update_persistent_state` |
| 4 | Different consequences from earlier choices | `test_04_earlier_choices_change_later_consequences` |
| 5 | Stakeholders with distinct goals | `test_05_stakeholders_give_distinct_advice` |
| 6 | Different endings | `test_06_different_endings_are_reachable` |
| 7 | Genuine dead end | `test_07_a_genuine_dead_end` |
| 8 | Factual explanation and causal chain | `test_08_factual_explanation_from_recorded_data` |
| 9 | Rewind to a verified recoverable checkpoint | `test_09_rewind_lands_on_a_verified_recoverable_checkpoint` |
| 10 | Different choice, then continue | `test_10_different_choice_then_finish` |
| 11 | Compare timelines | `test_11_compare_timelines` |
| 12 | Final report with transparent scoring | `test_12_report_with_transparent_scoring` |
| 13 | Refresh / restart and continue | `test_13_restart_the_application_and_carry_on` (browser refresh: `src/game/App.test.tsx`) |
| 14 | No AI key needed | `test_14_no_api_key_needed` |

## The 15 required engine tests

| Required test | Where |
|---|---|
| 1. Creating a new simulation | `test_engine.py::test_new_simulation_initial_state` |
| 2. Applying each decision type | `test_engine.py::test_every_choice_applies_without_error` (all 10 rounds), `test_isolate_effects_exact` |
| 3. Resource totals and time advancement | `test_engine.py::test_time_and_budget_accounting`, `test_state_is_clamped` |
| 4. Safety-critical restrictions | `test_engine.py::test_restricted_ops_blocked_without_safety_clearance`, `test_unsafe_operations_are_punished_not_rewarded`; `test_stakeholders.py::test_hard_constraints_are_vetoes_with_reasons` |
| 5. Conditional event triggering | `test_engine.py::test_flare_up_requires_unsafe_ops`, `test_interruption_only_without_full_containment`, `test_scout_report_depends_on_unverified_depot`, `test_strong_evidence_triggers_insurer_advance` |
| 6. Multiple possible endings | `test_engine.py::test_cautious_and_risky_reach_different_endings`, `test_safety_failure_ending_reachable`; acceptance 6 |
| 7. Detection of genuine dead ends | `test_phase3.py::test_unsafe_path_is_a_hard_dead_end_and_pauses_the_run`, `test_soft_dead_end_when_hospital_capacity_can_no_longer_reach_need` |
| 8. Recovery possible despite poor metrics | `test_phase3.py::test_recovery_possible_despite_poor_metrics`, `test_spending_most_of_the_budget_is_not_itself_a_dead_end` |
| 9. Correct recoverable checkpoint | `test_phase3.py::test_last_recoverable_checkpoint_is_the_decision_that_closed_the_window`, `test_earlier_reasonable_decision_is_not_blamed_as_fatal`; `test_planner.py::test_memoised_search_matches_naive_search_on_late_states` |
| 10. Rewind restores exact state | `test_phase3.py::test_rewind_restores_the_exact_checkpoint_state_and_explains_what_was_known` |
| 11. Original branch preserved | `test_phase3.py::test_failed_run_stays_intact_after_rewinding` |
| 12. Reproducible with a fixed seed | `test_engine.py::test_same_seed_same_decisions_identical_state`; `test_phase3.py::test_replaying_the_same_choice_after_rewind_reproduces_the_original` |
| 13. AI failure and deterministic fallback | `test_stakeholders.py::test_invalid_llm_output_falls_back_to_the_deterministic_text`, `test_llm_errors_never_break_the_game`, `test_model_failure_still_returns_advice_through_the_service` |
| 14. Persistence after restart | `test_phase3.py::test_state_survives_application_restart`; `test_stakeholders.py::test_advice_survives_application_restart`; `test_scoring.py::test_report_is_deterministic_and_cached_and_survives_restart` |
| 15. Invalid actions and malformed requests | `test_engine.py::test_unknown_choice_rejected`, `test_unaffordable_choice_rejected`; `test_phase3.py::test_invalid_requests_are_rejected_cleanly`; `test_api.py::test_malformed_decisions_return_structured_422` |

### End-to-end scenarios (HTTP)

- Cautious recovery: `test_api.py::test_e2e_cautious_recovery`
- Fast but risky: `test_api.py::test_e2e_fast_but_risky_trades_evidence_for_time`
- Poor strategy → dead end → rewind → recovery: `test_api.py::test_e2e_poor_strategy_dead_ends_then_rewinds_and_recovers`

## Cross-cutting guarantees and where they are checked

| Guarantee | Check |
|---|---|
| The hidden true stock is never shown during play (including inside recorded event changes) | `test_engine.py::test_player_facing_payloads_never_contain_the_hidden_stock_even_inside_recorded_changes`, `test_api.py::test_no_endpoint_leaks_the_hidden_stock_during_or_after_play_except_the_post_game_reveal`, soak test |
| The planner's winning plan is never returned | `test_phase3.py::test_analysis_never_leaks_the_winning_plan` |
| A dead end is never declared without proof | `test_planner.py::test_node_limit_yields_unknown_never_a_false_dead_end`; memoised search equals a naive search |
| Money alone can never leave the player with no option | `test_planner.py::test_money_alone_can_never_soft_lock_the_game` + regression |
| Failed requests change nothing | `test_phase3.py::test_failed_decision_writes_nothing`; replay is all-or-nothing |
| Advice never changes the world | `test_stakeholders.py::test_advice_is_deterministic_and_does_not_change_the_world` |
| Model output cannot invent facts | `test_stakeholders.py` (`invented_number`, `forbidden_content`, schema cases) |
| Scoring never involves a model | `test_scoring.py::test_scoring_code_never_involves_a_language_model` |
| The renderer cannot be handed markup | `src/comic/comic.test.tsx` (sanitiser, plain-text, source scan for `innerHTML`/`eval`) |
| Random players cannot break the game | `test_soak.py` |

## What was verified outside the automated suites

- Real browser (Microsoft Edge, headless) driving the real backend and the real Vite dev server through: start → play →
  dead end → rewind → refresh → finish → report → what-if → comparison, with zero console or network errors.
- A from-scratch install following the README exactly, in a clean copy of the repository.
- The optional language-model path against a local stub of the Messages API (good reply used, invented number rejected,
  server down → fallback). **It has not been run against the live Anthropic API** (no key was available).
