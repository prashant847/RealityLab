import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("natural read-aloud voice", () => {
  const played: string[] = [];
  const spoken: string[] = [];
  beforeEach(() => {
    vi.resetModules(); played.length = 0; spoken.length = 0;
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak: (u: { text: string }) => spoken.push(u.text), cancel: vi.fn(), getVoices: () => [] };
    class U { constructor(public text: string) {} rate = 1; lang = ""; voice = null; onstart = null; onend = null; onerror = null; }
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = U;
    URL.createObjectURL = vi.fn(() => "blob:x"); URL.revokeObjectURL = vi.fn();
    class A {
      onended: (() => void) | null = null; onerror = null; onpause = null;
      constructor(public src: string) { played.push(src); }
      play() { setTimeout(() => this.onended?.(), 0); return Promise.resolve(); }
      pause() { /* stopped */ }
    }
    (globalThis as unknown as { Audio: unknown }).Audio = A;
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("splits text into sentence-sized pieces", async () => {
    const { chunkText } = await import("./speak");
    expect(chunkText("One. Two! Three?")).toEqual(["One. Two! Three?"]);
    const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const parts = chunkText(long, 100);
    expect(parts.length).toBeGreaterThan(5);
    expect(parts.every((p) => p.length <= 100)).toBe(true);
    expect(parts.join(" ")).toBe(long);
    expect(chunkText("x".repeat(600), 260).every((p) => p.length <= 260)).toBe(true);
  });

  it("plays each piece from the local natural voice, in order, with the chosen voice and speed", async () => {
    const calls: { text: string; voice: string; rate: number }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
      if (url.includes("status")) return { ok: true, json: async () => ({ voices: ["female", "male"] }) };
      calls.push(JSON.parse(init!.body!));
      return { ok: true, blob: async () => new Blob(["x"]) };
    }));
    const { speak } = await import("./speak");
    const { setA11y } = await import("./a11y");
    setA11y({ voice: "male", speechRate: 1.2 });
    speak(`${"A".repeat(200)}. ${"B".repeat(200)}.`);
    await vi.waitFor(() => expect(played.length).toBe(2));
    expect(calls.map((c) => c.voice)).toEqual(["male", "male"]);
    expect(calls[0].rate).toBe(1.2);
    expect(calls[0].text.startsWith("A")).toBe(true);
    expect(spoken).toEqual([]);
  });

  it("falls back to the computer's voice when the natural voice is not installed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ voices: [] }) })));
    const { speak } = await import("./speak");
    speak("Hello there.");
    await vi.waitFor(() => expect(spoken).toEqual(["Hello there."]));
    expect(played).toEqual([]);
  });

  it("falls back from the failing piece onwards if the natural voice errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.includes("status") ? { ok: true, json: async () => ({ voices: ["female"] }) } : { ok: false, status: 502 })));
    const { speak } = await import("./speak");
    speak("It broke.");
    await vi.waitFor(() => expect(spoken).toEqual(["It broke."]));
  });
});
