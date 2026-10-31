import { useEffect, useState, useSyncExternalStore } from "react";
import { getA11y, useA11y } from "./a11y";

export const canSpeak = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

let speaking = false;
const listeners = new Set<() => void>();
const set = (v: boolean) => { speaking = v; listeners.forEach((l) => l()); };
export const useSpeaking = (): boolean => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => speaking, () => speaking);

export function stopSpeaking(): void { if (canSpeak()) window.speechSynthesis.cancel(); set(false); }

/** Speaks text with the computer's own voice. A short pause after cancelling avoids the browser dropping the new speech. */
export function speak(text: string): void {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 6000);
  const say = () => {
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = getA11y().speechRate;
    const v = synth.getVoices?.() ?? [];
    const en = v.find((x) => /^en/i.test(x.lang));
    if (en) { u.voice = en; u.lang = en.lang; }
    u.onstart = () => set(true); u.onend = () => set(false); u.onerror = () => set(false);
    synth.speak(u);
  };
  setTimeout(say, 80);
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
