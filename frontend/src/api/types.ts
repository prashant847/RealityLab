// Shapes returned by the FastAPI backend (see docs/API.md). The frontend only displays these;
// it never computes outcomes.
import type { ComicPageData } from "../comic/types";

export interface Choice {
  id: string; label: string; summary: string; cost: number; time_cost: number;
  confirm: boolean; available: boolean; reason: string;
}
export interface GameEvent {
  event_id: string; round: number; clock: string; title: string; text: string;
  assets: string[]; recovery_note: string; effects: string[];
}
export interface FinalDispatch {
  shipped_hospital: number; shipped_contract: number; shipped_total: number; sellable_units: number;
  hospital_need: number; contract_need: number; transport_capacity: number; window_min: number;
  deadline_met: boolean; provisional_shortfall: number; ending: string; ending_title: string;
  ending_text: string; public_trust: number; staff_safety: number; budget: number;
}
export interface Scene {
  round?: number; clock?: string; title?: string; brief?: string; environment?: string;
  info?: string[]; events: GameEvent[]; choices?: Choice[]; completed: boolean;
  page?: ComicPageData; final?: FinalDispatch | null; ending?: string | null;
}
export interface WorldView {
  round: number; status: string; window_min: number; budget: number; system_integrity: number;
  recovery_progress: number; evidence_quality: number; containment: string; recorded_units: number;
  verified_units: number; provisional_units: number; staff_safety: number; labour_pct: number;
  facility: string; transport_capacity: number; hospital_need: number; contract_need: number;
  public_trust: number; supplier_confidence: number; trust: Record<string, number>; flags: string[];
}
export interface ContributingDecision {
  index: number; round: number; clock: string; choice_id: string; label: string;
  kind: "closed_recovery_window" | "narrowed_options"; effects: string[]; known_at_time: string[];
  viable_alternatives: string[]; risks_visible_then: string[]; risks_created: string[];
  consequences: { title: string; round: number; text: string; effects: string[] }[];
  chance_events_after: { title: string; probability: number; text: string }[];
  options_keeping_recovery_before: { viable: number; total: number };
  options_keeping_recovery_after: { viable: number; total: number };
}
export interface Analysis {
  title: string; severity: "soft" | "hard" | null; continue_allowed: boolean;
  what_happened: string[]; why_unrecoverable: { id: string; text: string }[];
  contributing_decisions: ContributingDecision[]; risks_not_addressed: string[];
  risks_created_by_decisions: string[]; last_recoverable_checkpoint: number | null;
  critical_point: null | {
    checkpoint_index: number; round: number; clock: string; decision_taken: string;
    better_options: string[]; known_at_time: string[];
  };
  timeline: { index: number; round: number; label: string; tier_reached: number | null; best_tier_available: number }[];
  best_reachable_tier: number | null;
  projection: null | { ending: string; ending_title: string | null; events: { title: string; round: number }[] };
}
export interface RunInfo {
  id: string; kind: string; attempt: number; status: string; parent_run_id: string | null;
  branch_checkpoint_index: number | null; accepted_risk: boolean; ending: string | null;
}
export interface SimulationView {
  simulation: { id: string; seed: number; active_run_id: string; rewinds_used: number; max_rewinds: number; rewinds_left: number };
  run: RunInfo; state: WorldView; scene: Scene; risks: { id: string; text: string }[];
  analysis: Analysis | null; checkpoints: { index: number; round: number; clock: string; inherited: boolean }[];
  rewind_context?: {
    from_run_id: string; checkpoint_index: number; round: number; clock: string; known_at_decision: string[];
    risks_at_decision: { id: string; text: string }[]; previous_choice: string | null;
    discovered_later: { title: string; round: number; clock: string; text: string }[]; note: string;
  } | null;
  outcome?: { choice_id: string; label: string; consequence: string; effects: string[]; events: GameEvent[]; completed: boolean };
}

export type Verdict = "support" | "caution" | "oppose" | "neutral";
export type StakeholderKey = "kavya" | "arjun" | "nisha" | "raghav" | "isha";
export interface Advice {
  stakeholder: StakeholderKey; name: string; role: string; round: number; clock: string;
  recommendation: string | null; recommendation_label: string | null; confidence: number; uncertainty: string | null;
  stances: { choice_id: string; label: string; verdict: Verdict; reasons: string[]; vetoed: boolean }[];
  facts: string[]; private: { text: string; reliability: number; verified: boolean }[];
  reaction: { verdict: "challenge" | "agree" | "mixed"; choice_id: string; label: string; why: string } | null;
  reaction_text: string | null; dialogue: string; source: "policy" | "llm"; note: string | null; cached: boolean;
}

export type Rating = "sound" | "questionable" | "poor";
export interface ReportDecision {
  index: number; round: number; clock: string; choice_id: string; label: string; rating: Rating;
  outcome: "as_expected" | "unlucky" | "lucky"; verdict: string; bad_luck: string[]; p_objective: number; p_best: number;
  warned_by: { stakeholder: string; why: string }[]; effects: string[]; known_info: string[];
  impact: { score_delta: number; by_category: Record<string, number>; recovery_gain: number };
  alternative: null | { choice_id: string; label: string; recommended_by: string[]; p_objective: number; differences: string[] };
}
export interface Loss {
  kind: string; amount: number; unit: string; event: string; round: number; clock: string; probability: number; chance: boolean;
  avoidable: boolean; alternative: string | null; caused_by: null | { index: number; label: string };
  earlier_chances: { index: number; label: string; alternative: string }[];
}
export interface AttemptInfo {
  run_id: string; attempt: number; kind: string; status: string; ending: string | null; score: number | null; decisions: number;
  quality: Record<string, number>; active: boolean; label: string;
}
export interface Report {
  version: number; run_id: string; simulation_id: string; seed: number; decision_count: number;
  ending: { id: string; title: string; text: string };
  overall: { score: number; band: string; raw: number; cap: string | null };
  categories: { id: string; name: string; weight: number; score: number; weighted: number; formula: string; measures: string; inputs: Record<string, unknown> }[];
  decisions: ReportDecision[]; strongest_decisions: number[]; most_damaging_decisions: number[]; recovery_improvers: number[];
  avoidable_losses: Loss[]; unavoidable_losses: Loss[]; missed_opportunities: { kind: string; text: string }[];
  recommended_alternatives: { index: number; clock: string; chosen: string; label: string; recommended_by: string[]; differences: string[]; why: string }[];
  focus_next: { category: string; score: number; advice: string }[];
  quality: Record<string, number>; attempts: AttemptInfo[];
  reveal: { recorded_units: number; true_units: number; records_overstated_by: number; verified_units: number; existing_but_unverified: number; note: string };
}
export interface CheckpointView {
  index: number; round: number; clock: string; title: string; brief: string; known_info: string[];
  risks: { id: string; text: string }[]; chosen_choice_id: string | null;
  choices: (Choice & { chosen: boolean })[];
}
export interface RunSummary {
  run_id: string; label: string; status: string; ending: string; decisions: number; critical_events: string[]; injuries: boolean;
  metrics: Record<string, number | null>;
}
export interface Comparison {
  base: RunSummary; other: RunSummary; same_seed: boolean; first_difference: number | null; note: string;
  metrics: { metric: string; base: number | null; other: number | null; delta: number | null; favours: "base" | "other" | "same" | null }[];
  timeline: { index: number; diverged: boolean; same_choice: boolean;
    base: null | { round: number; clock: string; label: string; events_before: string[]; readiness_after: number };
    other: null | { round: number; clock: string; label: string; events_before: string[]; readiness_after: number } }[];
  favours_count: Record<string, number>; branch: { other_branched_from_base: boolean; checkpoint_index: number | null };
}
