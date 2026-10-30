import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { roundViews } from "../fixtures";
import { FACES, deriveEmotion, faceFor, type Emotion, type EmotionContext } from "./art/emotion";
import { Figure } from "./art/Figure";
import { LOOKS } from "./art/looks";
import type { PoseId } from "./art/poses";
import { planPage, planShot } from "./art/shots";
import { CHARACTER_IDS, EXPRESSIONS, type CharacterId, type PanelData } from "./types";
import { sanitizePage } from "./validate";

const ctx = (o: Partial<EmotionContext>): EmotionContext => ({
  id: "kavya", expression: "calm", kind: "speech", text: "", effects: [], environment: "ops_office", emphasis: null, panelId: "t", ...o,
});
const panel = (o: Partial<PanelData> = {}): PanelData => ({ id: "p", environment: "warehouse_floor", characters: [], effects: [], narration: null, dialogue: [], emphasis: null, ...o });
const pages = roundViews.slice(0, 10).map((v) => sanitizePage(v.scene.page).page);

describe("emotion is read from the situation, not only the eight stored expressions", () => {
  it("maps the brief's examples to the right feeling", () => {
    expect(deriveEmotion(ctx({ expression: "worried", effects: ["smoke"], id: "raghav" }))).toBe("fear");
    expect(deriveEmotion(ctx({ expression: "worried", effects: ["emergency_lighting"], id: "kavya" }))).toBe("suppressed_panic");
    expect(deriveEmotion(ctx({ expression: "worried", id: "arjun", text: "none of them are ours, these logins" }))).toBe("suspicion");
    expect(deriveEmotion(ctx({ expression: "worried", id: "player", kind: "thought" }))).toBe("regret");
    expect(deriveEmotion(ctx({ expression: "angry", id: "kavya", kind: "shout" }))).toBe("anger");
    expect(deriveEmotion(ctx({ expression: "angry", id: "nisha", kind: "speech" }))).toBe("frustration");
    expect(deriveEmotion(ctx({ expression: "exhausted", id: "player" }))).toBe("exhaustion");
    expect(deriveEmotion(ctx({ expression: "determined", id: "player" }))).toBe("determination");
    expect(deriveEmotion(ctx({ expression: "calm", id: "raghav" }))).toBe("composure");
    expect(deriveEmotion(ctx({ expression: "angry", id: "isha", kind: "shout" }))).toBe("urgency");
  });

  it("gives the same stored expression different faces in different situations", () => {
    const seen = new Set<Emotion>();
    const cases: Partial<EmotionContext>[] = [
      { id: "arjun", text: "logins" }, { id: "kavya", effects: ["smoke"] }, { id: "player", kind: "thought" }, { id: "nisha" }, { id: "raghav", effects: ["power_failure"] },
    ];
    for (const c of cases) seen.add(deriveEmotion(ctx({ expression: "worried", ...c })));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it("covers every stored expression and never returns an unknown emotion", () => {
    for (const id of CHARACTER_IDS) for (const e of EXPRESSIONS) expect(Object.keys(FACES)).toContain(deriveEmotion(ctx({ id, expression: e })));
  });

  it("draws each emotion differently (brows, lids, mouth or posture differ between every pair)", () => {
    const keys = ["browLift", "browAngle", "browAsym", "lid", "squint", "mouth", "corner", "open", "clench", "bags", "sweat", "drop", "shoulders", "gaze"] as const;
    const list = Object.values(FACES);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const differing = keys.filter((k) => list[i][k] !== list[j][k]).length;
      expect(differing, `${list[i].emotion} vs ${list[j].emotion}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("varies slightly per panel so repeated emotions do not look stamped, without changing the emotion", () => {
    const a = faceFor("fear", "panel-a"), b = faceFor("fear", "panel-b");
    expect(a.emotion).toBe(b.emotion);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(faceFor("fear", "panel-a")).toEqual(a);
  });
});

describe("character identity stays constant", () => {
  it("gives each character a distinct, fixed look", () => {
    const sig = CHARACTER_IDS.map((id) => `${LOOKS[id].hair}|${LOOKS[id].cloth}|${LOOKS[id].hairStyle}|${LOOKS[id].outfit}`);
    expect(new Set(sig).size).toBe(CHARACTER_IDS.length);
  });

  it("keeps hair, outfit and skin in every emotion and pose", () => {
    const poses: PoseId[] = ["idle", "point", "hold_paper", "radio", "hands_desk"];
    for (const id of CHARACTER_IDS) {
      const look = LOOKS[id];
      for (const e of Object.keys(FACES) as Emotion[]) {
        const { container, unmount } = render(<Figure id={id} face={faceFor(e, "x")} pose={poses[e.length % poses.length]} facing="right" />);
        const html = container.innerHTML;
        for (const colour of [look.hair, look.skin, look.under]) expect(html, `${id}/${e}/${colour}`).toContain(colour);
        expect(container.querySelector("svg")).toHaveAttribute("data-character", id);
        unmount();
      }
    }
  });

  it("changes the picture when the emotion changes", () => {
    const html = (e: Emotion) => { const r = render(<Figure id="arjun" face={faceFor(e, "x")} />); const s = r.container.innerHTML; r.unmount(); return s; };
    expect(html("fear")).not.toBe(html("exhaustion"));
    expect(html("suspicion")).not.toBe(html("determination"));
  });

  it("draws the figure from behind for over-the-shoulder shots (no face)", () => {
    const { container } = render(<Figure id="player" face={faceFor("exhaustion", "b")} view="back" facing="right" />);
    expect(container.querySelector('path[fill="#e7e2d8"]')).toBeNull();     // no eye whites
  });
});

describe("shot planning", () => {
  it("uses a variety of compositions across the story", () => {
    const kinds = new Set(pages.flatMap((p) => planPage(p).plans.map((s) => s.kind)));
    for (const k of ["wide", "close", "ots"]) expect([...kinds], k).toContain(k);
    expect(kinds.size).toBeGreaterThanOrEqual(4);
  });

  it("never repeats one composition for every panel of a page, and varies panel shapes", () => {
    for (const p of pages.filter((q) => q.panels.length > 1)) {
      const plan = planPage(p);
      expect(new Set(plan.plans.map((s) => s.kind)).size, p.panels[0].id).toBeGreaterThan(1);
    }
    const ratios = new Set(pages.flatMap((p) => planPage(p).plans.map((s) => s.ratio.toFixed(2))));
    expect(ratios.size).toBeGreaterThanOrEqual(4);
  });

  it("puts the operations director in the foreground, seen from behind, when talking with someone", () => {
    const s = planShot(panel({ characters: [{ id: "kavya", expression: "angry", side: "left" }, { id: "player", expression: "worried", side: "right" }],
      dialogue: [{ speaker: "kavya", text: "Stay back!", kind: "shout" }] }));
    expect(s.kind).toBe("ots");
    const p = s.placements.find((x) => x.id === "player")!;
    expect(p.view).toBe("back");
    expect(p.height).toBeGreaterThan(s.placements.find((x) => x.id === "kavya")!.height);
  });

  it("makes characters do things: leaning in at a workstation, pointing, directing people away, studying a report", () => {
    const pose = (id: CharacterId, expression: PanelData["characters"][0]["expression"], environment: PanelData["environment"], extra: Partial<PanelData> = {}) =>
      planShot(panel({ environment, characters: [{ id, expression, side: "left" }], ...extra })).placements[0].pose;
    expect(pose("arjun", "worried", "control_room")).toBe("lean_terminal");
    expect(pose("raghav", "pointing", "alt_depot")).toBe("point_map");
    expect(pose("raghav", "pointing", "loading_dock")).toBe("point");
    expect(pose("kavya", "angry", "electrical_area", { dialogue: [{ speaker: "kavya", text: "Back!", kind: "shout" }] })).toBe("stop_palm");
    expect(pose("nisha", "worried", "ops_office")).toBe("hold_paper");
    expect(pose("isha", "angry", "hospital_corridor")).toBe("open_palm");
    expect(pose("player", "worried", "ops_office", { dialogue: [{ speaker: "player", text: "…", kind: "thought" }] })).toBe("hover_pen");
  });

  it("looks where the story points: thoughts look down, evidence is looked at, listeners watch the speaker", () => {
    const thought = planShot(panel({ characters: [{ id: "player", expression: "worried", side: "left" }], dialogue: [{ speaker: "player", text: "hm", kind: "thought" }] }));
    expect(thought.placements[0].face.gaze).toBe("down");
    const logs = planShot(panel({ environment: "control_room", characters: [{ id: "arjun", expression: "worried", side: "left" }], effects: ["system_alert"],
      dialogue: [{ speaker: "arjun", text: "These logins are not ours.", kind: "speech" }] }));
    expect(logs.placements[0].face.gaze).toBe("evidence");
    expect(logs.evidence).toBe(true);
  });

  it("is deterministic and leaves the scene data untouched", () => {
    const p = pages[5];
    const before = JSON.stringify(p);
    expect(JSON.stringify(planPage(p))).toBe(JSON.stringify(planPage(p)));
    expect(JSON.stringify(p)).toBe(before);
  });

  it("turns the lights off with the power and adds the red alert state only for system alerts", () => {
    expect(planShot(panel({ effects: ["power_failure"] })).lit).toBe(false);
    expect(planShot(panel({ effects: ["system_alert"] })).alert).toBe(true);
    expect(planShot(panel()).lit).toBe(true);
  });
});
