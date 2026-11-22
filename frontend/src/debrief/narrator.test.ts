import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Narrator } from "./narrator";
import type { Scene } from "./script";

vi.mock("../a11y/speak", () => ({ chunkText: (t: string) => [t], fetchPiece: vi.fn(), hasHumanVoices: () => false, naturalVoiceReady: async () => false, stopSpeaking: () => undefined }));

const scenes = (n: number): Scene[] => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, chapter: `Part ${i}`, mood: "calm", lines: [`Point ${i} is made here.`, `And the second line of point ${i}.`] }));

describe("the Archivist goes on until the report is finished", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("plays every scene without anyone pressing anything, then stops at the end", async () => {
    const n = new Narrator(scenes(5), "en", "calm");
    const seen = new Set<number>();
    n.subscribe(() => seen.add(n.getState().scene));
    n.play();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(n.getState().ended).toBe(true);
    expect(n.getState().playing).toBe(false);
    n.destroy();
  });

  it("is not stopped by a hiccup in the middle: it carries on from the same line", async () => {
    const n = new Narrator(scenes(4), "en", "calm");
    let thrown = false;
    n.subscribe(() => { if (!thrown && n.getState().scene === 1 && n.getState().line === 1) { thrown = true; throw new Error("a listener blew up"); } });
    n.play();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(thrown).toBe(true);
    expect(n.getState().ended).toBe(true);
    n.destroy();
  });

  it("stops when he is stopped by hand, and carries on from there when asked", async () => {
    const n = new Narrator(scenes(4), "en", "calm");
    n.play();
    await vi.advanceTimersByTimeAsync(20_000);
    n.pause();
    const at = { ...n.getState() };
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(n.getState().playing).toBe(false);
    expect(n.getState().scene).toBe(at.scene);
    n.play();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(n.getState().ended).toBe(true);
    n.destroy();
  });
});
