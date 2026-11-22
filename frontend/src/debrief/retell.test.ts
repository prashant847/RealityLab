import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRetold } from "./retell";
import type { Scene } from "./script";

const base: Scene[] = [{ id: "open", chapter: "Your ledger", mood: "calm", lines: ["Come in, and sit down."] }, { id: "close", chapter: "Close", mood: "warm", lines: ["Go well."] }];

function serve(delayed: { resolve: () => void }) {
  const retold = { source: "claude", scenes: [{ id: "open", lines: ["Retold hello."] }, { id: "close", lines: ["Retold goodbye."] }] };
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  delayed.resolve = release;
  vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("status")
    ? Promise.resolve({ ok: true, json: async () => ({ claude: true }) })
    : gate.then(() => ({ ok: true, json: async () => retold }))));
}

afterEach(() => vi.unstubAllGlobals());

describe("the Archivist's retelling", () => {
  it("replaces the scripted lines when it arrives before the debrief begins", async () => {
    const d = { resolve: () => undefined };
    serve(d);
    const { result } = renderHook(({ locked }) => useRetold(base, "en", locked), { initialProps: { locked: false } });
    await act(async () => { d.resolve(); await new Promise((r) => setTimeout(r, 20)); });
    expect(result.current.status).toBe("claude");
    expect(result.current.scenes[0].lines[0]).toBe("Retold hello.");
  });

  it("never swaps the lines once he has begun, because that restarts him and he stops after one sentence", async () => {
    const d = { resolve: () => undefined };
    serve(d);
    const { result, rerender } = renderHook(({ locked }) => useRetold(base, "en", locked), { initialProps: { locked: false } });
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    const before = result.current.scenes;
    rerender({ locked: true });                                   // Begin my debrief
    await act(async () => { d.resolve(); await new Promise((r) => setTimeout(r, 20)); });
    expect(result.current.scenes).toBe(before);                   // the very same array: the narrator is not rebuilt
    expect(result.current.scenes[0].lines[0]).toBe("Come in, and sit down.");
  });
});
