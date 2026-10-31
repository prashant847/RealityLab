import { useEffect, useRef, useState } from "react";

const SLIDES = [
  { icon: "🧭", title: "Experience your future before you choose it", body: "RealityLab AI puts you inside real professions: a hospital doctor, a process safety manager, an operations lead. You make the decisions and see what follows." },
  { icon: "☀️", title: "Every job has two sides", body: "First live a normal day on the job. Nothing is on fire, and what you do quietly sets up what comes next. Then face the crisis, with whatever your day built." },
  { icon: "⚖️", title: "Then compare how you did", body: "Finish both parts of two jobs and Career Comparison shows how you performed and how it felt. The choice of career is always yours." },
] as const;
export const WELCOME_KEY = "rl.welcomed";

/** A short first-launch tour. Skippable at any time (Esc), and never shown again once closed. */
export function Welcome({ onDone }: { onDone: (name: string) => void }) {
  const [i, setI] = useState(0);
  const [name, setName] = useState("");
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, [i]);
  useEffect(() => { const on = (e: KeyboardEvent) => { if (e.key === "Escape") onDone(name); }; window.addEventListener("keydown", on); return () => window.removeEventListener("keydown", on); }, [name, onDone]);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];
  return (
    <div className="wl-back">
      <div className="wl" role="dialog" aria-modal="true" aria-labelledby="wl-h">
        <div className="wl-art" aria-hidden="true">{s.icon}</div>
        <p className="wl-step">{i + 1} of {SLIDES.length}</p>
        <h2 id="wl-h">{s.title}</h2>
        <p className="wl-body">{s.body}</p>
        {i === 0 && <label className="wl-name">What should we call you? (optional)<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>}
        <div className="wl-dots" aria-hidden="true">{SLIDES.map((_, k) => <span key={k} className={k === i ? "on" : ""} />)}</div>
        <div className="wl-actions">
          <button type="button" className="hub-btn" onClick={() => onDone(name)}>Skip</button>
          <button ref={btn} type="button" className="hub-btn hub-btn--primary" onClick={() => (last ? onDone(name) : setI(i + 1))}>{last ? "Let's begin" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
