import type { SimReport } from "../api/sims";

/** How a finished run is turned into the judgements printed in the professional report. Everything here is derived from the decisions in that one run. */
export type Band = "outstanding" | "strong" | "competent" | "developing" | "not-yet";

export interface Assessment {
  score: number; band: Band; bandLabel: string;
  /** What this result suggests, worded as an indication from one simulated scenario, never as a hiring decision. */
  indication: string;
  quality: number;            // 0..100 from the ratings of the decisions
  skillsAverage: number | null;
  strongShare: number;        // % of decisions rated strong
  soundShare: number;         // % rated strong or mixed
  criticalErrors: number;     // decisions rated weak
  strengths: { label: string; percent: number; detail: string }[];
  development: { label: string; percent: number; detail: string }[];
}

const WEIGHT = { strong: 100, mixed: 55, weak: 10 } as const;

export const BANDS: { min: number; band: Band; label: string; indication: string }[] = [
  { min: 90, band: "outstanding", label: "Outstanding", indication: "Judgement under pressure was consistently excellent. In this scenario the candidate chose the most effective action almost every time, which is the pattern expected of someone ready to work with little supervision." },
  { min: 75, band: "strong", label: "Strong", indication: "Judgement was sound and dependable, with a few choices that a stronger option would have improved. This is the pattern of a candidate who would be effective in the role with normal onboarding." },
  { min: 60, band: "competent", label: "Competent", indication: "Judgement was reasonable overall but uneven. The candidate handled the main risks and would benefit from guidance on the decisions listed under development areas." },
  { min: 40, band: "developing", label: "Developing", indication: "Several decisions carried avoidable risk or cost. The candidate shows promise but would need structured training and supervision before taking on this kind of responsibility." },
  { min: 0, band: "not-yet", label: "Not yet ready", indication: "Decisions in this scenario led to serious harm or failure. The candidate should repeat the training, studying the stronger options shown in this report, before being considered for work like this." },
];

export const indicatorFor = (percent: number): string =>
  percent >= 85 ? "Consistently chose the most effective action." :
  percent >= 65 ? "Usually chose sound actions, with occasional room to improve." :
  percent >= 45 ? "Mixed judgement: some sound choices and some that cost time, trust or safety." :
  "Often chose actions that carried avoidable risk.";

export function assess(rep: SimReport): Assessment {
  const s = rep.summary;
  const n = Math.max(1, s.decisions);
  const quality = Math.round((s.strong * WEIGHT.strong + s.mixed * WEIGHT.mixed + s.weak * WEIGHT.weak) / n);
  const skillsAverage = rep.skills.length ? Math.round(rep.skills.reduce((a, x) => a + x.percent, 0) / rep.skills.length) : null;
  let score = Math.round(skillsAverage === null ? quality : quality * 0.7 + skillsAverage * 0.3);
  if (rep.outcome.tone === "bad") score = Math.min(score, 59);     // a run that ended badly cannot read as competent
  score = Math.max(0, Math.min(100, score));
  const b = BANDS.find((x) => score >= x.min)!;
  const ranked = [...rep.skills].sort((a, c) => c.percent - a.percent);
  return {
    score, band: b.band, bandLabel: b.label, indication: b.indication, quality, skillsAverage,
    strongShare: Math.round((s.strong / n) * 100), soundShare: Math.round(((s.strong + s.mixed) / n) * 100), criticalErrors: s.weak,
    strengths: ranked.filter((x) => x.percent >= 65).slice(0, 3).map((x) => ({ label: x.label, percent: x.percent, detail: x.explanation })),
    development: [...ranked].reverse().filter((x) => x.percent < 75).slice(0, 3).map((x) => ({ label: x.label, percent: x.percent, detail: x.explanation })),
  };
}

/** The opening paragraph of the report. */
export function summaryText(rep: SimReport, a: Assessment, name: string): string {
  const s = rep.summary;
  const when = rep.completed_at ? ` on ${new Date(rep.completed_at).toLocaleDateString(undefined, { dateStyle: "long" })}` : "";
  const mix = s.decisions === s.strong ? `all ${s.decisions} were the strongest available option` : `${s.strong} were the strongest available option, ${s.mixed} were acceptable and ${s.weak} were weak`;
  return `${name} completed “${rep.simulation}” in the role of ${rep.role}${when}, making ${s.decisions} decision${s.decisions === 1 ? "" : "s"} under realistic constraints. Of these, ${mix}. The scenario ended with: ${rep.outcome.title}. Overall performance is rated ${a.bandLabel.toLowerCase()} (${a.score} out of 100).`;
}
