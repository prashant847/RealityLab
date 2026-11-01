import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "./narrator";
import type { Scene } from "./script";

/**
 * The Archivist's brain: Claude (through the Claude CLI on this computer, via the local service) retells the debrief as an old librarian who has just
 * finished reading the player's story aloud. It is handed only the facts the scripted debrief already holds, so it can re-voice but never invent; if the CLI
 * is missing, slow or replies with something that fails the service's checks, the scripted lines are used and nothing else changes.
 */
export type RetellStatus = "idle" | "thinking" | "claude" | "original";

const factsOf = (s: Scene): string[] => {
  const f = [...s.lines];
  const c = s.card;
  if (c) { f.push(...c.rows.map((r) => `${r.label}: ${r.value}`)); if (c.better) f.push(`A stronger option: ${c.better}`); }
  return f.map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 12);
};

/** `locked` (the debrief is already being told): never fetch or swap lines now, so the voice is not cut off and replaced half-way. */
export function useRetold(base: Scene[], lang: Lang, locked = false): { scenes: Scene[]; status: RetellStatus; skip: () => void; again: () => void } {
  const [told, setTold] = useState<{ for: Scene[]; lines: Record<string, string[]> } | null>(null);
  const [status, setStatus] = useState<RetellStatus>("idle");
  const ctl = useRef<AbortController | null>(null);
  const [round, setRound] = useState(0);
  const fresh = useRef(false);
  const lockRef = useRef(locked);
  lockRef.current = locked;

  useEffect(() => {
    setTold(null);
    if (!base.length || typeof fetch !== "function" || lockRef.current) { setStatus("original"); return; }
    const ac = new AbortController();
    ctl.current = ac;
    const timer = window.setTimeout(() => ac.abort(), 135000);
    setStatus("thinking");
    void (async () => {
      try {
        const st = await fetch("/api/debrief/narrate/status", { signal: ac.signal }).then((r) => (r.ok ? r.json() : { claude: false })).catch(() => ({ claude: false }));
        if (!st.claude) { setStatus("original"); return; }
        const r = await fetch("/api/debrief/narrate", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: ac.signal,
          body: JSON.stringify({ lang, fresh: fresh.current, scenes: base.map((s) => ({ id: s.id, chapter: s.chapter, mood: s.mood, facts: factsOf(s) })) }),
        });
        fresh.current = false;
        const j = r.ok ? await r.json() as { source: string; scenes: { id: string; lines: string[] }[] } : null;
        if (!j || j.source !== "claude") { setStatus("original"); return; }
        setTold({ for: base, lines: Object.fromEntries(j.scenes.map((x) => [x.id, x.lines])) });
        setStatus("claude");
      } catch { if (!ac.signal.aborted || ctl.current === ac) setStatus((s) => (s === "thinking" ? "original" : s)); }
      finally { window.clearTimeout(timer); }
    })();
    return () => { ac.abort(); window.clearTimeout(timer); };
  }, [base, lang, round]);

  const scenes = useMemo(() => (told && told.for === base ? base.map((s) => (told.lines[s.id] ? { ...s, lines: told.lines[s.id] } : s)) : base), [told, base]);   // stable: a new array would restart the narrator
  const skip = useCallback(() => { ctl.current?.abort(); setStatus("original"); }, []);
  const again = useCallback(() => { fresh.current = true; setRound((n) => n + 1); }, []);
  return { scenes, status, skip, again };
}
