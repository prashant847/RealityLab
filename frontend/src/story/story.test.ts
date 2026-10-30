import { describe, expect, it } from "vitest";
import { CHOICE_PLAIN, ROUND_PLAIN, GLOSSARY, plainPage } from "./plain";
import { BEATS, EVENT_BEATS, ANALYST, carriedProps } from "./beats";
import { composeConsequence, composeRoundPage, layoutFor, oneVehicle, textReserve } from "./compose";

const CHOICES = ["r1_controlled", "r1_isolate", "r1_rush", "r2_evacuate", "r2_maintain", "r2_secure", "r3_alt_transport", "r3_divert_depot", "r3_reserve_hospital", "r4_pause", "r4_provisional", "r4_release_verified", "r5_balanced", "r5_logistics", "r5_minimal", "r5_negotiated", "r5_restoration", "r6_parallel", "r6_restrict", "r6_specialist", "r7_commitments", "r7_hospital_first", "r7_negotiate", "r8_restricted", "r8_suspend", "r8_transfer", "r9_briefing", "r9_holding", "r9_wait", "r10_provisional", "r10_sweep", "r10_verified"];
const EVENTS = ["secondary_interruption", "secondary_interruption_partial", "flare_up", "panel_failure_evacuated", "panel_failure_assessed", "dock_flooding", "depot_scout_report", "provisional_shortage", "hospital_escalation", "insurer_advance", "reinfection_alert", "verified_route_pays_off", "contract_penalty_notice", "power_dip", "credit_due"];

describe("story beats", () => {
  it("has a picture for every decision and every event", () => {
    for (const c of CHOICES) expect(BEATS[c], c).toBeDefined();
    for (const e of EVENTS) expect(EVENT_BEATS[e], e).toBeDefined();
    for (let r = 1; r <= 10; r++) expect(ANALYST[r]).toBeDefined();
  });

  it("draws different pictures for different choices of the same round", () => {
    const sig = (id: string) => JSON.stringify(BEATS[id]);
    for (let r = 1; r <= 10; r++) {
      const ids = CHOICES.filter((c) => c.startsWith(`r${r}_`));
      // Choices that deliberately share a look (r5 restoration/logistics: both a large commitment) are the only allowed repeats.
      const unique = new Set(ids.map(sig));
      expect(unique.size, `round ${r}`).toBeGreaterThanOrEqual(ids.length === 5 ? 4 : ids.length);
    }
  });

  it("carries earlier choices into later rooms", () => {
    expect(carriedProps("electrical_area", ["r2_evacuate"], 8)).toContain("tape_barrier");
    expect(carriedProps("electrical_area", ["r2_secure"], 8)).toContain("cones");
    expect(carriedProps("loading_dock", ["r4_pause"], 6)).toContain("hold_tags");
    expect(carriedProps("loading_dock", ["r4_pause"], 4)).toHaveLength(0);
    expect(carriedProps("control_room", ["r1_isolate", "r6_restrict"], 7)).toEqual(["cables_cut", "account_locked"]);
    expect(carriedProps("ops_office", ["r5_minimal"], 8)).toEqual(["effort_small"]);
    expect(carriedProps("ops_office", ["r5_restoration"], 8)).toEqual(["effort_large"]);
    expect(carriedProps("ops_office", [], 8)).toEqual([]);
  });
});

describe("layout and composition", () => {
  it("gives every panel count a layout with one shape per panel", () => {
    for (let n = 1; n <= 6; n++) expect(layoutFor(n).shapes.length).toBeGreaterThanOrEqual(Math.min(n, 6));
  });

  const page = { layout: "two", panels: [
    { id: "p1", environment: "electrical_area", characters: [{ id: "kavya", side: "right", expression: "angry" }], dialogue: [{ speaker: "kavya", text: "Out!", kind: "shout" }], effects: ["smoke"] },
    { id: "p2", environment: "control_room", characters: [{ id: "arjun", side: "left", expression: "worried" }], dialogue: [], effects: [] },
  ] };

  it("composes a round page with the story panels plus an evidence panel", () => {
    const s = composeRoundPage(2, page, ["Server A is down"], ["r1_isolate"]);
    expect(s.panels.map((p) => p.id)).toEqual(["p1", "p2", "evidence"]);
    expect(s.panels[2].inspect).toBe(true);
    expect(s.panels[0].layers.some((l) => l.role === "person" && l.person?.who === "kavya")).toBe(true);
  });

  it("shows the same round differently after different earlier choices", () => {
    const a = composeRoundPage(2, page, [], ["r1_isolate"]);
    const b = composeRoundPage(2, page, [], ["r1_rush"]);
    const props = (s: typeof a) => JSON.stringify(s.panels[1].layers.map((l) => l.flatEnv?.props));
    expect(props(a)).not.toBe(props(b));
  });

  it("leaves the round 1 decision visible in the round 2 electrical room", () => {
    const fx = (t: string[]) => JSON.stringify(composeRoundPage(2, page, [], t).panels[0].layers[0].flatEnv?.effects);
    expect(fx(["r1_rush"])).not.toBe(fx(["r1_isolate"]));
  });

  it("does not crash on a malformed page", () => {
    expect(() => composeRoundPage(3, null, [], [])).not.toThrow();
  });

  it("composes a consequence page: the decision, then each event with the backend text", () => {
    const ev = [{ event_id: "dock_flooding", title: "Water at the loading dock", clock: "9:40 PM", text: "Boxes are damaged.", assets: ["rain"] }] as never;
    const s = composeConsequence("r2_evacuate", "Evacuate", "The area is clear.", ev, "electrical_area");
    expect(s.panels).toHaveLength(2);
    expect(s.panels[0].caption).toBe("The area is clear.");
    expect(s.panels[1].narration).toContain("Water at the loading dock");
    expect(s.panels[1].caption).toBe("Boxes are damaged.");
  });

  it("falls back to a neutral beat for an unknown choice id", () => {
    const s = composeConsequence("zzz", "Something", "Done.", [], "ops_office");
    expect(s.panels).toHaveLength(1);
  });
});

describe("text never sits on a character", () => {
  it("reserves room above people who stand under a bubble, and none where there is no text", () => {
    expect(textReserve([], undefined, 1.86, 1)(24)).toBe(0);
    const r = textReserve([{ text: "Scanners are dead. And these logins, none of them are ours.", at: "l" }], undefined, 1.86, 1);
    expect(r(24)).toBeGreaterThan(15);
    expect(r(76)).toBe(0);
  });

  it("longer text reserves more room", () => {
    const at = (t: string) => textReserve([{ text: t, at: "c" }], undefined, 1.86, 1)(50);
    expect(at("x".repeat(120))).toBeGreaterThan(at("short line"));
  });

  it("places the person lower in a panel when a bubble is above them", () => {
    const page = { layout: "two", panels: [{ id: "p1", environment: "warehouse_floor", characters: [{ id: "arjun", side: "left", expression: "calm" }], dialogue: [{ speaker: "arjun", text: "x".repeat(110), kind: "speech" }], effects: [] }, { id: "p2", environment: "warehouse_floor", characters: [{ id: "arjun", side: "left", expression: "calm" }], dialogue: [], effects: [] }] };
    const s = composeRoundPage(1, page, [], []);
    const top = (i: number) => s.panels[i].layers.find((l) => l.role === "person")!.box!.y;
    expect(top(0)).toBeGreaterThan(top(1));
  });
});

describe("variety", () => {
  const page = { layout: "single", panels: [{ id: "p1", environment: "warehouse_floor", characters: [], dialogue: [], effects: [] }] };
  it("uses different staff and set dressing in different rounds", () => {
    const staff = (r: number) => composeRoundPage(r, page, [], []).panels[0].layers.filter((l) => l.role === "person").map((l) => l.person!.who).join();
    const seeds = new Set([1, 2, 3, 4, 5, 6].map((r) => composeRoundPage(r, page, [], []).panels[0].layers[0].flatEnv!.seed));
    expect(seeds.size).toBe(6);
    expect(new Set([1, 2, 3, 4, 5, 6].map(staff)).size).toBeGreaterThan(2);
  });
});

describe("one world scale", () => {
  const page = { layout: "single", panels: [{ id: "p1", environment: "loading_dock", characters: [{ id: "raghav", side: "left", expression: "calm" }], dialogue: [], effects: [] }] };
  it("zooms the room to match the person, never out", () => {
    const fe = composeRoundPage(10, page, [], []).panels[0].layers[0].flatEnv!;
    expect(fe.zoom).toBeGreaterThanOrEqual(1);
    expect(fe.zoom).toBeLessThanOrEqual(2.4);
  });
  it("does not zoom a panel with nobody in it", () => {
    const empty = { layout: "single", panels: [{ id: "p1", environment: "flooded_highway", characters: [], dialogue: [], effects: [] }] };
    expect(composeRoundPage(3, empty, [], []).panels[0].layers[0].flatEnv!.zoom).toBeUndefined();
  });
  it("keeps vehicles out of the interior depot", () => {
    expect(carriedProps("alt_depot", ["r3_alt_transport"], 8)).toEqual([]);
    expect(carriedProps("loading_dock", ["r3_alt_transport"], 8)).toContain("extra_trucks");
  });
});

describe("people in one panel share one size", () => {
  it("draws everyone at the same height even when only one speaker has a bubble above them", () => {
    const page = { layout: "single", panels: [{ id: "p1", environment: "warehouse_floor", characters: [{ id: "arjun", side: "left", expression: "calm" }, { id: "kavya", side: "right", expression: "calm" }], dialogue: [{ speaker: "arjun", text: "x".repeat(110), kind: "speech" }], effects: [] }] };
    const hs = composeRoundPage(1, page, [], []).panels[0].layers.filter((l) => l.role === "person").map((l) => Math.round(l.box!.h));
    expect(new Set(hs).size).toBe(1);
  });
});

describe("one vehicle per scene", () => {
  it("never shows two vehicle props together", () => {
    expect(oneVehicle(["extra_trucks", "loaded_truck", "cones"])).toEqual(["loaded_truck", "cones"]);
    expect(oneVehicle(["cones"])).toEqual(["cones"]);
  });
  it("does not add hired trucks to a dock that already has the loaded truck", () => {
    expect(carriedProps("loading_dock", ["r3_alt_transport", "r7_hospital_first"], 10)).toEqual(["loaded_truck"]);
  });
});

describe("plain-language layer", () => {
  it("covers every decision and round", () => {
    for (const c of CHOICES) { const p = CHOICE_PLAIN[c]; expect(p, c).toBeDefined(); expect(p.done.length).toBeGreaterThan(5); }
    for (let r = 1; r <= 10; r++) {
      expect(ROUND_PLAIN[r].where).toBeTruthy(); expect(ROUND_PLAIN[r].problem).toBeTruthy(); expect(ROUND_PLAIN[r].job).toMatch(/^Decide/);
      expect(["documented", "reconstructed", "simulation"]).toContain(ROUND_PLAIN[r].label);
    }
  });

  it("keeps the briefing short enough to read at a glance", () => {
    for (let r = 1; r <= 10; r++) { const p = ROUND_PLAIN[r]; expect(p.where.length, `${r} where`).toBeLessThanOrEqual(120); expect(p.problem.length, `${r} problem`).toBeLessThanOrEqual(190); expect(p.job.length, `${r} job`).toBeLessThanOrEqual(190); }
  });

  it("tells the truth about what is simulation: the rounds with no documented counterpart say so", () => {
    for (const r of [2, 3, 7, 8]) expect(ROUND_PLAIN[r].label, `round ${r}`).toBe("simulation");
    expect(ROUND_PLAIN[7].record).toMatch(/simulation/i);
  });

  it("passes page text through untouched (the backend wording is already plain)", () => {
    const page = { layout: "two", panels: [
      { id: "r1b", environment: "warehouse_floor", characters: [{ id: "arjun", side: "left", expression: "worried" }], dialogue: [{ speaker: "arjun", text: "Original words.", kind: "speech" }], narration: "Original note.", effects: [] },
    ] };
    const out = plainPage(page);
    expect(out.panels[0].dialogue[0].text).toBe("Original words.");
    expect(out.panels[0].narration).toBe("Original note.");
  });

  it("explains hard words only when they are used", () => {
    const used = (t: string) => GLOSSARY.filter((g) => g.match.test(t)).map((g) => g.term);
    expect(used("Logs show a third-party software update arriving just before the failures.")).toEqual(expect.arrayContaining(["Third-party software update", "Evidence"]));
    expect(used("The cranes are idle.")).toEqual([]);
  });
});
