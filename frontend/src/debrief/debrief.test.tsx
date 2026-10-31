import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SimReport } from "../api/sims";
import type { Report } from "../api/types";
import { scriptForBlackout, scriptForSim, spoken } from "./script";

const sim = (over: Partial<SimReport> = {}): SimReport => ({
  simulation: "COVID-era Hospital", simulation_id: "covid", role: "Duty Medical Lead", run_id: "r1", kind: "crisis",
  outcome: { id: "held", title: "Strained but functioning", text: "The hospital kept going at a cost.", tone: "neutral" },
  final_meters: [{ label: "Oxygen reserve", value: 90, good: "high" }, { label: "Understanding of the record", value: 50, good: "high" }],
  summary: { decisions: 3, strong: 1, mixed: 1, weak: 1 },
  major_decisions: [
    { step: "The first surge", part: "Day 1", chose: "Structured plan", rating: "strong", consequence: "Triage became orderly.", lesson: "Agree criteria early.", effects: [{ label: "Quality of care", from: 70, to: 80, good: "high" }], stronger_option: null },
    { step: "Oxygen", part: "Day 2", chose: "Wait and see", rating: "weak", consequence: "Supplies ran low before anyone acted.", lesson: "A call is a start.", effects: [{ label: "Oxygen reserve", from: 80, to: 60, good: "high" }, { label: "Staff wellbeing", from: 70, to: 66, good: "high" }], stronger_option: "Audit use today" },
    { step: "After the peak", part: "Day 9", chose: "Move on", rating: "mixed", consequence: "People were tired.", lesson: "", effects: [], stronger_option: "Hold a debrief" },
  ],
  challenges: [], skills: [{ id: "t", label: "Teamwork", percent: 40, level: "Developing", decisions_counted: 2, explanation: "Held back by one choice.", evidence: [] }],
  improve: [{ step: "Oxygen", chose: "Wait and see", why: "A call is a start.", stronger_option: "Audit use today", rating: "weak" }],
  focus_areas: [], lessons: ["Agree criteria.", "Debrief early."], sources: [], recommended_next: { id: "bhopal", title: "Bhopal", reason: "Study safeguards." }, note: "n", ...over,
});

describe("the Archivist's script is built from the report, never invented", () => {
  it("spoken() writes symbols out for the voice", () => {
    expect(spoken("Cost −5% & “quoted” — done")).toBe("Cost minus 5 percent and quoted, done");
  });

  it("covers the ending, what went well, each mistake with the stronger option, skills and a close", () => {
    const scenes = scriptForSim(sim());
    expect(scenes.map((s) => s.id)).toEqual(["open", "good-0", "turn", "fault-0", "fault-1", "prep", "skills", "close"]);
    const text = (id: string) => scenes.find((s) => s.id === id)!.lines.join(" ");
    expect(text("open")).toContain("Strained but functioning");
    expect(text("open")).toContain("1 strong, 1 mixed, and 1 weak");
    expect(text("good-0")).toContain("Structured plan");
    expect(text("fault-0")).toContain("Wait and see");                       // weak is told before mixed
    expect(text("fault-0")).toContain("A stronger option was: Audit use today");
    expect(text("fault-0")).toContain("oxygen reserve from 80 to 60");
    expect(text("fault-1")).toContain("Hold a debrief");
    expect(text("skills")).toContain("Teamwork sits at 40 percent");
    expect(scenes.find((s) => s.id === "fault-0")!.card).toMatchObject({ better: "Audit use today", chips: [{ text: "Weak", tone: "bad" }, { text: "You chose: Wait and see", tone: "plain" }] });
    expect(scenes.every((s) => s.lines.length > 0 && s.lines.every((l) => l.trim().length > 0))).toBe(true);
  });

  it("says plainly when there is nothing to fix, and never makes up a mistake", () => {
    const only = sim({ summary: { decisions: 1, strong: 1, mixed: 0, weak: 0 }, major_decisions: [sim().major_decisions[0]], improve: [] });
    const ids = scriptForSim(only).map((s) => s.id);
    expect(ids).toContain("clean");
    expect(ids.some((i) => i.startsWith("fault"))).toBe(false);
  });

  it("a workday names what was left unprepared, and a crisis names the head start", () => {
    const wd = scriptForSim(sim({ kind: "workday", prep: [{ flag: "a", label: "Oxygen audit", text: "", effects: [], status: "missed" }, { flag: "b", label: "Triage drill", text: "", effects: [], status: "full" }] as never }));
    expect(wd.find((s) => s.id === "prep")!.lines.join(" ")).toContain("did not set up oxygen audit");
    const cr = scriptForSim(sim({ prepared: [{ flag: "b", label: "Triage drill", text: "", full: true }] }));
    expect(cr.find((s) => s.id === "prep")!.lines.join(" ")).toContain("triage drill");
  });

  it("BLACKOUT: the warning, the cost and the better choice come from the scored report", () => {
    const d = (i: number, label: string, rating: "sound" | "poor", delta: number, alt: string | null) => ({
      index: i, round: i + 1, clock: `Day ${i + 1}`, choice_id: label, label, rating, outcome: "as_expected", verdict: `Verdict ${label}.`, bad_luck: [],
      p_objective: 0.5, p_best: 0.7, warned_by: rating === "poor" ? [{ stakeholder: "raghav", why: "He said the records could not be trusted." }] : [], effects: [], known_info: [],
      impact: { score_delta: delta, by_category: {}, recovery_gain: 0 }, alternative: alt ? { choice_id: "x", label: alt, recommended_by: [], p_objective: 0.8, differences: ["It keeps the evidence."] } : null,
    });
    const rep = {
      version: 1, run_id: "b", simulation_id: "b", seed: 1, decision_count: 2, ending: { id: "e", title: "Critical shortfall", text: "Too little cargo moved." },
      overall: { score: 41.2, band: "Poor", raw: 41.2, cap: null }, categories: [{ id: "safety", name: "Safety", weight: 1, score: 40, weighted: 40, formula: "", measures: "", inputs: {} }],
      decisions: [d(0, "Isolate first", "sound", 3, null), d(1, "Restore from backup", "poor", -6, "Verify the backup")], strongest_decisions: [0], most_damaging_decisions: [1], recovery_improvers: [],
      avoidable_losses: [{ kind: "k", amount: 12, unit: "lots", event: "A reopening", round: 3, clock: "Day 5", probability: 1, chance: false, avoidable: true, alternative: "Verify the backup", caused_by: { index: 1, label: "Restore from backup" }, earlier_chances: [] }],
      unavoidable_losses: [], missed_opportunities: [], recommended_alternatives: [], focus_next: [{ category: "Safety", score: 40, advice: "Check before you trust." }],
      quality: { sound: 1, questionable: 0, poor: 1, unlucky: 0, lucky: 0 }, attempts: [],
      reveal: { recorded_units: 100, true_units: 70, records_overstated_by: 30, verified_units: 40, existing_but_unverified: 30, note: "" },
    } as unknown as Report;
    const scenes = scriptForBlackout(rep);
    const all = scenes.flatMap((s) => s.lines).join(" ");
    expect(all).toContain("Restore from backup");
    expect(all).toContain("had warned you");
    expect(all).toContain("What you could have done: Verify the backup");
    expect(all).toContain("records were overstated by 30");
    expect(all).toContain("trace that to decision 2");
    expect(scenes.map((s) => s.id)).toEqual(["open", "good-0", "turn", "fault-0", "losses", "reveal", "focus", "close"]);
  });
});

// ---------------------------------------------------------------- the player
describe("the narrator plays the debrief with the natural voice", () => {
  const played: string[] = [];
  beforeEach(() => {
    vi.resetModules(); played.length = 0;
    URL.createObjectURL = vi.fn(() => "blob:x"); URL.revokeObjectURL = vi.fn();
    class A {
      onended: (() => void) | null = null; onerror = null; onpause = null; paused = false; currentTime = 0; ended = false;
      constructor(public src: string) { played.push(src); }
      play() { setTimeout(() => this.onended?.(), 0); return Promise.resolve(); }
      pause() { this.paused = true; }
    }
    (globalThis as unknown as { Audio: unknown }).Audio = A;
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("speaks each line in order, moves through the scenes and ends", async () => {
    const said: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
      if (url.includes("status")) return { ok: true, json: async () => ({ voices: ["female"] }) };
      said.push(JSON.parse(init!.body!).text);
      return { ok: true, blob: async () => new Blob(["x"]) };
    }));
    const { Narrator } = await import("./narrator");
    const n = new Narrator([{ id: "a", chapter: "A", mood: "calm", lines: ["First line.", "Cost −5%."] }, { id: "b", chapter: "B", mood: "warm", lines: ["Second scene."] }]);
    const seen: number[] = [];
    n.subscribe(() => seen.push(n.getState().scene));
    n.play();
    await vi.waitFor(() => expect(n.getState().ended).toBe(true), { timeout: 4000 });
    expect(said).toEqual(["First line.", "Cost minus 5 percent.", "Second scene."]);
    expect(n.getState()).toMatchObject({ engine: "natural", playing: false, ended: true });
    expect(seen).toContain(1);
    n.destroy();
  });

  it("jumping to a section restarts speech there, and pausing stops further speech", async () => {
    const said: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
      if (url.includes("status")) return { ok: true, json: async () => ({ voices: ["female"] }) };
      said.push(JSON.parse(init!.body!).text);
      return { ok: true, blob: async () => new Blob(["x"]) };
    }));
    const { Narrator } = await import("./narrator");
    const n = new Narrator([{ id: "a", chapter: "A", mood: "calm", lines: ["Alpha."] }, { id: "b", chapter: "B", mood: "calm", lines: ["Bravo."] }, { id: "c", chapter: "C", mood: "calm", lines: ["Charlie."] }]);
    n.play(); n.goto(2);
    await vi.waitFor(() => expect(n.getState().ended).toBe(true), { timeout: 4000 });
    expect(said.at(-1)).toBe("Charlie.");
    expect(said).not.toContain("Bravo.");
    n.destroy();
  });

  it("with no voice at all it still runs, as captions on a timer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ voices: [] }) })));
    const { Narrator } = await import("./narrator");
    const n = new Narrator([{ id: "a", chapter: "A", mood: "calm", lines: ["Hi."] }]);
    n.play();
    await vi.waitFor(() => expect(n.getState().engine).toBe("timed"), { timeout: 2000 });
    expect(n.getState().playing).toBe(true);
    n.pause();
    expect(n.getState().playing).toBe(false);
    n.destroy();
  });
});

// ---------------------------------------------------------------- the stage
describe("the debrief stage", () => {
  it("offers the debrief or the written report, starts on request, and is controllable from the keyboard", async () => {
    vi.resetModules();
    const calls: string[] = [];
    let state = { scene: 0, line: 0, playing: false, ended: false, engine: "natural" as const };
    const subs = new Set<() => void>();
    vi.doMock("./narrator", () => ({
      Narrator: class {
        rate = 1; constructor(public scenes: unknown[]) {}
        getState = () => state; subscribe = (l: () => void) => { subs.add(l); return () => subs.delete(l); };
        mouth = () => ({ open: 0, wide: 0.5 });
        play() { calls.push("play"); state = { ...state, playing: true }; subs.forEach((l) => l()); }
        pause() { calls.push("pause"); state = { ...state, playing: false }; subs.forEach((l) => l()); }
        toggle() { if (state.playing) this.pause(); else this.play(); }
        goto(i: number) { calls.push(`goto${i}`); state = { ...state, scene: i }; subs.forEach((l) => l()); }
        next() { calls.push("next"); } prev() { calls.push("prev"); } destroy() { /* done */ }
      },
    }));
    const { Debrief } = await import("./Debrief");
    const onWritten = vi.fn();
    render(<Debrief scenes={scriptForSim(sim())} title="COVID" onWritten={onWritten} />);
    expect(screen.getByRole("heading", { name: "The Archivist has read your ledger" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Read the written report instead" }));
    expect(onWritten).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Begin my debrief" }));
    expect(calls).toEqual(["play"]);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByText(/Come in\. Sit down\./)).toBeInTheDocument();                 // captions are on by default
    await userEvent.keyboard("{ArrowRight}");
    expect(calls).toContain("next");
    await userEvent.keyboard(" ");
    expect(calls).toContain("pause");
    await userEvent.keyboard("c");
    expect(screen.queryByText(/Come in\. Sit down\./)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Transcript" }));
    expect(screen.getByRole("region", { name: "Transcript of the debrief" })).toHaveTextContent("Come in. Sit down.");
    await userEvent.click(screen.getByRole("button", { name: "Written report" }));
    expect(onWritten).toHaveBeenCalledTimes(2);
    vi.doUnmock("./narrator");
  });
});
