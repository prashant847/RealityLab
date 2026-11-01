import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setA11y } from "../a11y/a11y";
import { getClip, readingMs, storyVoicesReady, voiceStatus } from "./voice";

class FakeAudio { onloadedmetadata: (() => void) | null = null; onerror: (() => void) | null = null; duration = 2.5; preload = ""; paused = true;
  constructor(public src: string) { setTimeout(() => this.onloadedmetadata?.(), 0); } play() { return Promise.resolve(); } pause() { /* */ } }

function stubFetch(human: boolean, ttsOk = true) {
  const calls: { url: string; body?: string }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body as string | undefined });
    if (url === "/api/tts/status") return { ok: true, json: async () => ({ human, voices: [] }) };
    return ttsOk ? { ok: true, blob: async () => new Blob(["x"]) } : { ok: false };
  }));
  return calls;
}

beforeEach(() => {
  vi.stubGlobal("Audio", FakeAudio);
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:clip";
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
  setA11y({ storyVoices: true });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("story voices", () => {
  it("are ready only when switched on and some voice exists", async () => {
    stubFetch(true);
    await voiceStatus(true);
    expect(await storyVoicesReady()).toBe(true);
    setA11y({ storyVoices: false });
    expect(await storyVoicesReady()).toBe(false);
  });

  it("fetch a line once for its role and reuse it, with its measured length", async () => {
    const calls = stubFetch(true);
    await voiceStatus(true);
    const a = await getClip("Day three. Admissions doubled.", "narrator");
    const b = await getClip("Day three.   Admissions doubled.", "narrator");
    expect(a).toEqual({ url: "blob:clip", ms: 2500 });
    expect(b).toBe(a);
    const tts = calls.filter((c) => c.url === "/api/tts");
    expect(tts).toHaveLength(1);
    expect(JSON.parse(tts[0].body!)).toMatchObject({ voice: "narrator", text: "Day three. Admissions doubled." });
    await getClip("Day three. Admissions doubled.", "char_arjun");
    expect(calls.filter((c) => c.url === "/api/tts")).toHaveLength(2);                // another role is another voice
  });

  it("give null when no voice is available, so the words stay up for a reading-length pause instead", async () => {
    stubFetch(false);
    await voiceStatus(true);
    expect(await getClip("Nobody can say this.", "narrator")).toBeNull();
    stubFetch(true, false);
    await voiceStatus(true);
    expect(await getClip("The service refuses this one.", "librarian")).toBeNull();
    expect(readingMs("one two three")).toBe(2200);
    expect(readingMs("word ".repeat(30))).toBeGreaterThan(8000);
  });
});
