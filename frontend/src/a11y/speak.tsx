import { useEffect, useState } from "react";
import { getA11y, useA11y } from "./a11y";

export const canSpeak = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

export function stopSpeaking(): void { if (canSpeak()) window.speechSynthesis.cancel(); }
export function speak(text: string): void {
  if (!canSpeak() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
  u.rate = getA11y().speechRate; u.lang = "en";
  window.speechSynthesis.speak(u);
}

/** "Read aloud": speaks the text of this screen using the computer's own voice. Shown when the setting is on. */
export function ReadAloud({ text, label = "Read this aloud" }: { text: () => string; label?: string }) {
  const a = useA11y();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!getA11y().readAloud || e.key.toLowerCase() !== "r" || e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"))) return;
      setSpeaking(true); speak(text());
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [text]);
  if (!a.readAloud || !canSpeak()) return null;
  return (
    <button type="button" className="read-aloud" aria-pressed={speaking} onClick={() => { if (speaking) { stopSpeaking(); setSpeaking(false); } else { setSpeaking(true); speak(text()); } }}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a5 5 0 0 1 0 7" /></svg>
      {speaking ? "Stop reading" : label} <kbd>R</kbd>
    </button>
  );
}
