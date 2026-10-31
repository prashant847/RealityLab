import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SimReport } from "../api/sims";
import type { Report } from "../api/types";
import { scriptForBlackout, scriptForSim, spoken } from "./script";
import { hn, hiText, scriptForBlackoutHi, scriptForSimHi } from "./hi";

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
    expect(spoken("about 2-3 weeks, 2–3 days, 07:30, 3/10 beds, 40 → 55, ₹12.0 lakh")).toBe("about 2 to 3 weeks, 2 to 3 days, 7:30, 3 out of 10 beds, 40 to 55, 12 lakh rupees");
    expect(spoken("Day 3, 06:00 AM (nurses) e.g. 24")).not.toMatch(/dash|zero/);
  });

  it("says things differently each time: the greeting and the closing rotate with the seed, and the facts stay", () => {
    const opens = new Set(Array.from({ length: 12 }, (_, i) => scriptForSim(sim(), i * 977 + 5)[0].lines[0]));
    const closes = new Set(Array.from({ length: 12 }, (_, i) => scriptForSim(sim(), i * 977 + 5).at(-1)!.lines.at(-1)!));
    expect(opens.size).toBeGreaterThanOrEqual(3);
    expect(closes.size).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 12; i++) expect(scriptForSim(sim(), i).flatMap((s) => s.lines).join(" ")).toContain("Wait and see");
    expect(scriptForSim(sim(), 9)).toEqual(scriptForSim(sim(), 9));                                   // the same seed always gives the same debrief
  });

  it("covers the ending, what went well, each mistake with the stronger option, skills and a close", () => {
    const scenes = scriptForSim(sim(), 1);
    expect(scenes.map((s) => s.id)).toEqual(["open", "good-0", "turn", "fault-0", "fault-1", "prep", "skills", "close"]);
    const text = (id: string) => scenes.find((s) => s.id === id)!.lines.join(" ");
    expect(text("open")).toContain("Strained but functioning");
    expect(text("open")).toMatch(/1 (of them were )?strong,? 1 (were )?mixed,? (and )?(1 (were )?)?weak|1 strong, 1 mixed, and 1 weak|1 of them were strong, 1 were mixed/);
    expect(text("good-0")).toContain("Structured plan");
    expect(text("fault-0")).toContain("Wait and see");                       // weak is told before mixed
    expect(text("fault-0")).toContain("Audit use today");
    expect(text("fault-0")).toContain("oxygen reserve from 80 to 60");
    expect(text("fault-1")).toContain("Hold a debrief");
    expect(text("skills")).toMatch(/teamwork[^.]*40 percent/i);
    expect(scenes.find((s) => s.id === "fault-0")!.card).toMatchObject({ better: "Audit use today", chips: [{ text: "Weak", tone: "bad" }, { text: "You chose: Wait and see", tone: "plain" }] });
    expect(scenes.every((s) => s.lines.length > 0 && s.lines.every((l) => l.trim().length > 0))).toBe(true);
  });

  it("a dilemma's best available option is praised as a hard call, never listed as a mistake, in both languages", () => {
    const base = sim();
    const dil = sim({ summary: { decisions: 2, strong: 0, mixed: 1, weak: 1 }, major_decisions: [
      { step: "No beds left", part: "Day 2", chose: "Reopen the outpatient wing as a monitored step-down area, move stable patients there with clear criteria, and coordinate transfers with the neighbouring hospital", rating: "mixed", consequence: "Space opens for the sickest. Transfers and moves are planned and recorded. It costs staff time you do not have, and a few patients still wait.", lesson: "", effects: [], stronger_option: null, dilemma: true },
      { step: "Oxygen", part: "Day 3", chose: "Wait and see", rating: "weak", consequence: "Supplies ran low.", lesson: "", effects: [], stronger_option: "Audit use today", dilemma: false },
    ], improve: base.improve });
    const en = scriptForSim(dil);
    expect(en.find((s) => s.id === "good-0")!.lines.join(" ")).toMatch(/no perfect answer|genuine dilemma/);
    expect(en.find((s) => s.id === "good-0")!.card!.chips[0].text).toBe("Best available");
    expect(en.filter((s) => s.id.startsWith("fault")).map((s) => s.lines.join(" "))).toEqual([expect.stringContaining("Wait and see")]);   // only the real mistake
    const hi = scriptForSimHi(dil);
    expect(hi.find((s) => s.id === "good-0")!.lines.join(" ")).toContain("कोई पूरी तरह सही जवाब नहीं था");
    expect(hi.filter((s) => s.id.startsWith("fault"))).toHaveLength(1);
  });
  it("says plainly when there is nothing to fix, and never makes up a mistake", () => {
    const only = sim({ summary: { decisions: 1, strong: 1, mixed: 0, weak: 0 }, major_decisions: [sim().major_decisions[0]], improve: [] });
    const ids = scriptForSim(only).map((s) => s.id);
    expect(ids).toContain("clean");
    expect(ids.some((i) => i.startsWith("fault"))).toBe(false);
  });

  it("a workday names what was left unprepared, and a crisis names the head start", () => {
    const wd = scriptForSim(sim({ kind: "workday", prep: [{ flag: "a", label: "Oxygen audit", text: "", effects: [], status: "missed" }, { flag: "b", label: "Triage drill", text: "", effects: [], status: "full" }] as never }));
    expect(wd.find((s) => s.id === "prep")!.lines.join(" ")).toMatch(/(did not set up|left out|didn.t get around to) oxygen audit/);
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
    const scenes = scriptForBlackout(rep, 1);
    const all = scenes.flatMap((s) => s.lines).join(" ");
    expect(all).toContain("Restore from backup");
    expect(all).toMatch(/had warned you|had spoken up/);
    expect(all).toContain("Verify the backup");
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

  it("the commanding style uses the American voice, lower and slower than the calm one", async () => {
    const asked: { voice: string; rate: number }[] = [];
    const rates: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
      if (url.includes("status")) return { ok: true, json: async () => ({ voices: ["female", "male", "heroic", "hindi"] }) };
      const b = JSON.parse(init!.body!); asked.push({ voice: b.voice, rate: b.rate });
      return { ok: true, blob: async () => new Blob(["x"]) };
    }));
    class A2 {
      onended: (() => void) | null = null; onerror = null; onpause = null; paused = false; currentTime = 0; ended = false; playbackRate = 1; preservesPitch = true;
      constructor(public src: string) { /* recorded on play */ }
      play() { rates.push(this.playbackRate); setTimeout(() => this.onended?.(), 0); return Promise.resolve(); }
      pause() { this.paused = true; }
    }
    (globalThis as unknown as { Audio: unknown }).Audio = A2;
    const { Narrator } = await import("./narrator");
    const scenes = [{ id: "a", chapter: "A", mood: "calm" as const, lines: ["One line."] }];
    for (const [lang, style] of [["en", "calm"], ["en", "commanding"], ["hi", "commanding"]] as const) {
      const n = new Narrator(scenes, lang, style);
      n.play();
      await vi.waitFor(() => expect(n.getState().ended).toBe(true), { timeout: 4000 });
      n.destroy();
    }
    expect(asked.map((a) => a.voice)).toEqual(["male", "heroic", "hindi"]);
    expect(rates[1]).toBeLessThan(rates[0]);                                   // commanding is played back lower than calm
    expect(rates.every((r) => r < 1 && r >= 0.88)).toBe(true);                 // but never extreme
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

// ---------------------------------------------------------------- Hindi
const hiSim = (): SimReport => sim({
  role: "Duty Medical Lead at a fictional district hospital",
  outcome: { id: "held", title: "Strained but functioning", text: "The hospital kept going but at a cost: gaps in care, staff stretched or trust damaged. Some of those costs came from choices that could have been different.", tone: "neutral" },
  final_meters: [{ label: "Oxygen reserve", value: 90, good: "high" }],
  major_decisions: [
    { step: "The first surge", part: "Day 1", chose: "Set up a structured triage process using agreed criteria, name a triage lead per shift, and brief the team on what is known and unknown", rating: "strong", consequence: "Patients are sorted in a consistent way, and staff know who decides. The team is steadier.", lesson: "", effects: [{ label: "Quality of care", from: 70, to: 80, good: "high" }], stronger_option: null },
    { step: "No beds left", part: "Day 2", chose: "Stop admitting new patients until beds free up", rating: "weak", consequence: "People who needed help are turned away. Trust takes a hit.", lesson: "", effects: [{ label: "Family and community trust", from: 70, to: 58, good: "high" }, { label: "Quality of care", from: 83, to: 73, good: "high" }], stronger_option: "Reopen the outpatient wing as a monitored step-down area, move stable patients there with clear criteria, and coordinate transfers with the neighbouring hospital" },
  ],
  skills: [{ id: "t", label: "Teamwork", percent: 40, level: "Developing", decisions_counted: 2, explanation: "x", evidence: [{ step: "No beds left", choice: "Stop admitting new patients until beds free up", points: -2 }] }],
  lessons: ["Agree criteria before the peak; consistent, documented decisions are fairer and easier to defend."],
  recommended_next: { id: "bhopal", title: "Bhopal", reason: "Study how safeguards, cost pressure and warnings add up in industrial safety." },
});

describe("the Archivist in Hindi", () => {
  it("writes numbers out in Hindi words, so the voice never has to guess", () => {
    expect([0, 7, 21, 63, 100, 130, 220, 1250].map(hn)).toEqual(["शून्य", "सात", "इक्कीस", "तिरसठ", "एक सौ", "एक सौ तीस", "दो सौ बीस", "एक हज़ार दो सौ पचास"]);
  });

  it("tells the whole story from real, translated simulation text, in Hindi only", () => {
    const scenes = scriptForSimHi(hiSim());
    expect(scenes.map((s) => s.id)).toEqual(["open", "good-0", "turn", "fault-0", "prep", "skills", "close"]);
    const all = scenes.flatMap((s) => s.lines);
    expect(all.length).toBeGreaterThan(15);
    expect(all.every((l) => !/[A-Za-z]/.test(l))).toBe(true);                    // never an English word for the Hindi voice to stumble over
    const fault = scenes.find((s) => s.id === "fault-0")!.lines.join(" ");
    expect(fault).toContain(hiText("No beds left")!);
    expect(fault).toContain("मैंने इसे कमज़ोर आँका");
    expect(fault).toContain("एक बेहतर विकल्प यह था");
    expect(fault).toContain("परिवारों और समुदाय का भरोसा सत्तर से अट्ठावन हो गया");   // the biggest meter change, in Hindi words
    expect(scenes[0].lines.join(" ")).toContain("आपने तीन फ़ैसले लिए");
  });

  it("leaves out a sentence it cannot say in Hindi, rather than reading English with a Hindi voice", () => {
    const odd = hiSim();
    odd.major_decisions[1] = { ...odd.major_decisions[1], chose: "A choice nobody translated", consequence: "Nor this.", stronger_option: null };
    const lines = scriptForSimHi(odd).flatMap((s) => s.lines);
    expect(lines.every((l) => !/[A-Za-z]/.test(l))).toBe(true);
    expect(lines.join(" ")).not.toContain("A choice nobody translated");
  });

  it("BLACKOUT: sentences built from the numbers, names in Devanagari", () => {
    const d = (i: number, label: string, rating: "sound" | "poor", delta: number, alt: string | null) => ({
      index: i, round: i + 1, clock: i === 0 ? "Day 1 – 27 Jun" : "Days 2-3", choice_id: label, label, rating, outcome: "as_expected", verdict: "x", bad_luck: [], p_objective: 0.31, p_best: 0.74,
      warned_by: rating === "poor" ? [{ stakeholder: "raghav", why: "x" }] : [], effects: [], known_info: [], impact: { score_delta: delta, by_category: {}, recovery_gain: 0 },
      alternative: alt ? { choice_id: "x", label: alt, recommended_by: [], p_objective: 0.74, differences: [] } : null,
    });
    const rep = {
      version: 1, run_id: "b", simulation_id: "b", seed: 1, decision_count: 2, ending: { id: "e", title: "CRITICAL SHORTFALL", text: "Too little cargo moved; urgent customers remain at risk." },
      overall: { score: 41.2, band: "Poor", raw: 41.2, cap: null }, categories: [{ id: "safety", name: "Financial discipline", weight: 1, score: 40, weighted: 40, formula: "", measures: "", inputs: {} }],
      decisions: [d(0, "Cut the affected connections and keep the evidence", "sound", 3, null), d(1, "Bring everything back online as fast as possible", "poor", -6, "Recover in stages while watching the spread")],
      strongest_decisions: [0], most_damaging_decisions: [1], recovery_improvers: [],
      avoidable_losses: [{ kind: "k", amount: 12, unit: "points of staff safety", event: "Systems fail again", round: 3, clock: "Days 5-8", probability: 1, chance: false, avoidable: true, alternative: "Recover in stages while watching the spread", caused_by: { index: 1, label: "Bring everything back online as fast as possible" }, earlier_chances: [] }],
      unavoidable_losses: [], missed_opportunities: [], recommended_alternatives: [], focus_next: [{ category: "Financial discipline", score: 40, advice: "Stage spending and keep a reserve for the round-6 to round-8 contingencies; avoid deferred obligations you cannot meet." }],
      quality: { sound: 1, questionable: 0, poor: 1, unlucky: 0, lucky: 0 }, attempts: [],
      reveal: { recorded_units: 100, true_units: 70, records_overstated_by: 30, verified_units: 40, existing_but_unverified: 30, note: "" },
    } as unknown as Report;
    const scenes = scriptForBlackoutHi(rep);
    const all = scenes.flatMap((s) => s.lines).join(" ");
    expect(scenes.map((s) => s.id)).toEqual(["open", "good-0", "turn", "fault-0", "losses", "reveal", "focus", "close"]);
    expect(scenes.flatMap((s) => s.lines).every((l) => !/[A-Za-z]/.test(l))).toBe(true);
    expect(all).toContain("केवल इकतीस प्रतिशत में लक्ष्य पहुँच में रहता");
    expect(all).toContain("चौहत्तर प्रतिशत");
    expect(all).toContain("राघव ने आपको पहले ही चेताया था");
    expect(all).toContain("कर्मचारी सुरक्षा के बारह अंक");
    expect(all).toContain("रिकॉर्ड तीस बढ़ा-चढ़ाकर लिखे गए थे");
  });
});

// ---------------------------------------------------------------- the stage
describe("the debrief stage", () => {
  it("offers the debrief or the written report, starts on request, is controllable from the keyboard, and speaks English or Hindi", async () => {
    vi.resetModules();
    localStorage.removeItem("rl.debriefLang");
    const calls: string[] = [];
    const made: { lang: string; calls: string[] }[] = [];
    let state = { scene: 0, line: 0, playing: false, ended: false, engine: "natural" as const };
    const subs = new Set<() => void>();
    vi.doMock("./narrator", () => ({
      Narrator: class {
        rate = 1; mine: string[] = [];
        constructor(public scenes: unknown[], public lang = "en") { made.push({ lang: this.lang, calls: this.mine }); }
        getState = () => state; subscribe = (l: () => void) => { subs.add(l); return () => subs.delete(l); };
        mouth = () => ({ open: 0, wide: 0.5 });
        play() { calls.push("play"); this.mine.push("play"); state = { ...state, playing: true }; subs.forEach((l) => l()); }
        pause() { calls.push("pause"); state = { ...state, playing: false }; subs.forEach((l) => l()); }
        toggle() { if (state.playing) this.pause(); else this.play(); }
        goto(i: number) { calls.push(`goto${i}`); this.mine.push(`goto${i}`); state = { ...state, scene: i }; subs.forEach((l) => l()); }
        next() { calls.push("next"); } prev() { calls.push("prev"); } destroy() { /* done */ }
      },
    }));
    const { Debrief } = await import("./Debrief");
    const en = scriptForSim(sim(), 3), hi = scriptForSimHi(hiSim());
    const hello = en[0].lines[0];
    const scenesFor = (l: "en" | "hi") => (l === "hi" ? hi : en);
    const onWritten = vi.fn();
    render(<Debrief scenesFor={scenesFor} title="COVID" onWritten={onWritten} />);
    expect(screen.getByRole("heading", { name: "The Archivist has read your ledger" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Read the written report instead" }));
    expect(onWritten).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Begin my debrief" }));
    expect(calls).toEqual(["play"]);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByText(hello)).toBeInTheDocument();                 // captions are on by default
    await userEvent.keyboard("{ArrowRight}");
    expect(calls).toContain("next");
    await userEvent.keyboard(" ");
    expect(calls).toContain("pause");
    await userEvent.keyboard("c");
    expect(screen.queryByText(hello)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Transcript" }));
    expect(screen.getByRole("region", { name: "Transcript" })).toHaveTextContent(hello);

    // the language can be changed part-way through; it carries on from the same section, in Hindi, and is remembered
    await userEvent.click(screen.getAllByRole("radio", { name: "हिन्दी" })[0]);
    expect(made.at(-1)!.lang).toBe("hi");
    expect(made.at(-1)!.calls).toEqual(["goto0", "play"]);
    expect(localStorage.getItem("rl.debriefLang")).toBe("hi");
    expect(screen.getByRole("button", { name: "लिखित रिपोर्ट" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "लिखित रिपोर्ट" }));
    expect(onWritten).toHaveBeenCalledTimes(2);
    localStorage.removeItem("rl.debriefLang");
    vi.doUnmock("./narrator");
  });
});
