import { describe, expect, it } from "vitest";
import type { SimReport } from "../api/sims";
import { assess, indicatorFor, summaryText } from "./assessment";

const rep = (over: Partial<SimReport> = {}): SimReport => ({
  simulation: "Pre-Flight Checks", simulation_id: "gen_x", role: "Captain", run_id: "r1", completed_at: "2026-01-05T10:00:00Z",
  outcome: { id: "ok", title: "Cleared to fly", text: "t", tone: "good" }, final_meters: [], summary: { decisions: 5, strong: 5, mixed: 0, weak: 0 },
  major_decisions: [], challenges: [], skills: [{ id: "a", label: "Safety", percent: 90, level: "Strong", decisions_counted: 3, explanation: "e", evidence: [] }, { id: "b", label: "Teamwork", percent: 40, level: "Developing", decisions_counted: 2, explanation: "e", evidence: [] }],
  improve: [], focus_areas: [], lessons: [], sources: [], recommended_next: {}, note: "n", ...over,
}) as SimReport;

describe("the performance assessment", () => {
  it("scores decision quality and competencies, and names strengths and development areas", () => {
    const a = assess(rep({ summary: { decisions: 5, strong: 4, mixed: 1, weak: 0 } }));
    expect(a.score).toBe(Math.round(91 * 0.7 + 65 * 0.3));
    expect(a.bandLabel).toBe("Strong");
    expect(a.strengths.map((x) => x.label)).toEqual(["Safety"]);
    expect(a.development.map((x) => x.label)).toEqual(["Teamwork"]);
    expect(a.criticalErrors).toBe(0);
  });
  it("never reads a run that ended badly as competent, and rates mostly weak decisions as not yet ready", () => {
    const bad = assess(rep({ outcome: { id: "x", title: "Failed", text: "t", tone: "bad" }, summary: { decisions: 5, strong: 4, mixed: 1, weak: 0 }, skills: [] }));
    expect(bad.score).toBe(59);
    expect(assess(rep({ summary: { decisions: 4, strong: 0, mixed: 0, weak: 4 }, skills: [], outcome: { id: "x", title: "Failed", text: "t", tone: "bad" } })).bandLabel).toBe("Not yet ready");
  });
  it("describes the run in plain words and gives each competency level an indicator", () => {
    const t = summaryText(rep(), assess(rep()), "Asha Rao");
    expect(t).toMatch(/Asha Rao completed “Pre-Flight Checks” in the role of Captain/);
    expect(t).toMatch(/all 5 were the strongest available option/);
    expect(indicatorFor(90)).toMatch(/Consistently/);
    expect(indicatorFor(20)).toMatch(/avoidable risk/);
  });
});
