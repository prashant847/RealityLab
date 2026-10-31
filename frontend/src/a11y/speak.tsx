import { useEffect, useState, useSyncExternalStore } from "react";
import { getA11y, useA11y } from "./a11y";

const browserVoice = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
export const canSpeak = (): boolean => browserVoice() || naturalVoices.length > 0;

// The natural voice (Piper) runs on this computer; the app asks once which voices are installed. Without it the computer's own voice is used.
let naturalVoices: string[] = [];
let naturalChecked: Promise<void> | null = null;
const checkNatural = (): Promise<void> => naturalChecked ??= (typeof fetch === "function"
  ? fetch("/api/tts/status").then((r) => (r.ok ? r.json() : { voices: [] })).then((j: { voices?: string[] }) => { naturalVoices = j.voices ?? []; }).catch(() => { naturalVoices = []; })
  : Promise.resolve());
export const naturalVoiceReady = async (): Promise<boolean> => { await checkNatural(); return naturalVoices.length > 0; };
void checkNatural();

let speaking = false;
let session = 0;
let player: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();
const set = (v: boolean) => { speaking = v; listeners.forEach((l) => l()); };
export const useSpeaking = (): boolean => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => speaking, () => speaking);

export function stopSpeaking(): void {
  session++;
  if (player) { player.pause(); player = null; }
  if (browserVoice()) window.speechSynthesis.cancel();
  set(false);
}

/** Splits text into sentence-sized pieces so speech can start after the first one. */
export function chunkText(text: string, max = 260): string[] {
  const out: string[] = [];
  let cur = "";
  for (const sentence of text.replace(/\s+/g, " ").trim().match(/[^.!?।]+[.!?।]+["')\]]*\s*|[^.!?।]+$/g) ?? []) {
    if (cur && cur.length + sentence.length > max) { out.push(cur.trim()); cur = ""; }
    cur += sentence;
    while (cur.length > max) { const i = cur.lastIndexOf(" ", max); const cut = i > 40 ? i : max; out.push(cur.slice(0, cut).trim()); cur = cur.slice(cut); }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export async function fetchPiece(text: string, voice: string, rate: number): Promise<string> {
  const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice, rate }) });
  if (!r.ok) throw new Error(`speech ${r.status}`);
  return URL.createObjectURL(await r.blob());
}

const playUrl = (url: string, mine: number): Promise<void> => new Promise((resolve, reject) => {
  const el = new Audio(url);
  player = el;
  const done = () => { URL.revokeObjectURL(url); if (player === el) player = null; };
  el.onended = () => { done(); resolve(); };
  el.onerror = () => { done(); reject(new Error("playback failed")); };
  el.onpause = () => { if (session !== mine) { done(); resolve(); } };
  el.play().catch((e) => { done(); reject(e); });
});

function speakWithBrowser(text: string): void {
  if (!browserVoice()) { set(false); return; }
  const synth = window.speechSynthesis;
  synth.cancel();
  const say = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = getA11y().speechRate;
    const v = synth.getVoices?.() ?? [];
    const en = v.find((x) => /^en/i.test(x.lang));
    if (en) { u.voice = en; u.lang = en.lang; }
    u.onstart = () => set(true); u.onend = () => set(false); u.onerror = () => set(false);
    synth.speak(u);
  };
  setTimeout(say, 80);                                                 // a short pause after cancelling avoids the browser dropping the new speech
}

/** Speaks text with the natural offline voice, one sentence group at a time (the next is prepared while one plays); falls back to the computer's voice. */
export function speak(text: string): void {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!clean) return;
  stopSpeaking();
  const mine = session;
  set(true);
  void (async () => {
    if (!(await naturalVoiceReady()) || session !== mine) { if (session === mine) speakWithBrowser(clean); return; }
    const { voice, speechRate } = getA11y();
    const pieces = chunkText(clean);
    let next = fetchPiece(pieces[0], voice, speechRate);
    for (let i = 0; i < pieces.length; i++) {
      let url: string;
      try { url = await next; } catch { if (session === mine) speakWithBrowser(pieces.slice(i).join(" ")); return; }
      if (session !== mine) { URL.revokeObjectURL(url); return; }
      next = i + 1 < pieces.length ? fetchPiece(pieces[i + 1], voice, speechRate) : Promise.resolve("");
      next.catch(() => undefined);
      try { await playUrl(url, mine); } catch { if (session === mine) speakWithBrowser(pieces.slice(i).join(" ")); return; }
      if (session !== mine) return;
    }
    set(false);
  })();
}

// the screen can say what is worth reading; otherwise the whole main area is read
let provider: (() => string) | null = null;
export function readCurrentScreen(): void {
  const text = provider ? provider() : (document.getElementById("main")?.innerText ?? "");
  if (speaking) { stopSpeaking(); return; }
  speak(text);
}

const toast = (message: string) => window.dispatchEvent(new CustomEvent("rl:toast", { detail: message }));

/** Press R anywhere: reads the current screen (or stops reading). If read aloud is off, says how to turn it on. */
export function installReadAloudKey(): () => void {
  const on = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (e.key.toLowerCase() !== "r" || e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
    if (document.querySelector("[data-debrief]")) { toast("The Archivist is speaking. Press Space to pause."); return; }
    if (!getA11y().readAloud) { toast("Read aloud is off. Turn it on in Settings, then Accessibility."); return; }
    if (!canSpeak()) { toast("This computer has no speech voice available."); return; }
    e.preventDefault();
    toast(speaking ? "Stopped reading." : "Reading this screen aloud. Press R to stop.");
    readCurrentScreen();
  };
  window.addEventListener("keydown", on);
  return () => window.removeEventListener("keydown", on);
}

/** "Read aloud" button for a screen: speaks what the screen says is important (see `text`). Shown when the setting is on. */
export function ReadAloud({ text, label = "Read this aloud" }: { text: () => string; label?: string }) {
  const a = useA11y();
  const talking = useSpeaking();
  const [mine, setMine] = useState(false);
  useEffect(() => { provider = text; return () => { if (provider === text) provider = null; stopSpeaking(); }; }, [text]);
  useEffect(() => { if (!talking) setMine(false); }, [talking]);
  if (!a.readAloud || !canSpeak()) return null;
  const active = talking && mine;
  return (
    <button type="button" className="read-aloud" aria-pressed={active} onClick={() => { if (active) { stopSpeaking(); } else { setMine(true); speak(text()); } }}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a5 5 0 0 1 0 7" /></svg>
      {active ? "Stop reading" : label} <kbd>R</kbd>
    </button>
  );
}
