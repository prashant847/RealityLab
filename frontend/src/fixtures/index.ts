import raw from "./views.json";
import type { Advice, CheckpointView, Comparison, Report, SimulationView } from "../api/types";

// Real API responses captured from the backend (backend/tools/dump_fixtures.py).
const f = raw as unknown as {
  rounds: SimulationView[]; completed_partial: SimulationView; dead_end_hard: SimulationView;
  dead_end_soft: SimulationView; rewound: SimulationView; advice: Advice[]; advice_unverified: Advice;
  report: Report; report_good: Report; compare: Comparison; checkpoint: CheckpointView;
};
export const roundViews = f.rounds;
export const completedGood = f.rounds[f.rounds.length - 1];
export const completedPartial = f.completed_partial;
export const deadEndHard = f.dead_end_hard;
export const deadEndSoft = f.dead_end_soft;
export const rewound = f.rewound;
export const adviceSamples = f.advice;              // real answers from all five stakeholders at round 2
export const adviceUnverified = f.advice_unverified; // Raghav quoting an unconfirmed depot capacity
export const reportRisky = f.report;               // scored report of the fast-but-risky run
export const reportGood = f.report_good;           // scored report of the cautious run
export const comparison = f.compare;               // that run vs. an alternate final decision
export const checkpointNine = f.checkpoint;        // the final decision as it stood
