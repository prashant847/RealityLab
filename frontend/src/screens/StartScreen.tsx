import { useState } from "react";
import { HeroScene } from "../comic/flat/Hero";

export function StartScreen({ onStart, busy, notice }: { onStart: (seed?: number) => void; busy: boolean; notice: string | null }) {
  const [seed, setSeed] = useState("");
  const seedValid = seed === "" || /^\d{1,10}$/.test(seed) && Number(seed) <= 2 ** 31 - 1;
  return (
    <main className="start">
      <div className="start-hero">
        <HeroScene />
        <div className="start-title">
          <p className="kicker">RealityLab AI · Scenario 1</p>
          <h1>BLACKOUT</h1>
          <p className="lede">The NotPetya Incident</p>
        </div>
      </div>
      <div className="start-body">
        <p className="start-lead">
          On 27 June 2017 a cyberattack called NotPetya spread from Ukraine across the world. Among the companies it brought to a halt was the
          shipping giant Maersk: computers, servers and terminals went dark, and it took about ten days to rebuild the core systems. You lead a
          fictional recovery team through those days, one decision at a time.
        </p>
        <ul className="start-facts" aria-label="At a glance">
          <li><b>10</b><span>decisions</span></li>
          <li><b>~35</b><span>minutes</span></li>
          <li><b>↺</b><span>rewind to try another</span></li>
        </ul>
        <p className="start-note">
          Every choice changes what happens next. The story follows the documented events in outline; each scene is labelled so you always know which is which:
        </p>
        <p className="start-legend" aria-label="Scene labels">
          <span data-kind="documented">Documented</span><span data-kind="reconstructed">Reconstructed</span><span data-kind="simulation">Simulation</span>
        </p>
        {notice && <p className="notice" role="status">{notice}</p>}
        <form onSubmit={(e) => { e.preventDefault(); if (seedValid && !busy) onStart(seed === "" ? undefined : Number(seed)); }}>
          <button type="submit" className="primary big" disabled={busy || !seedValid}>Begin the simulation</button>
          <details className="advanced">
            <summary>Advanced</summary>
            <label>
              Fixed seed (optional — the same seed and choices always give the same result)
              <input inputMode="numeric" value={seed} onChange={(e) => setSeed(e.target.value.trim())}
                aria-invalid={!seedValid} placeholder="random" />
            </label>
            {!seedValid && <span className="field-error" role="alert">Enter a whole number up to 2147483647.</span>}
          </details>
        </form>
        <p className="muted fine start-fine">
          The people you meet are fictional roles, and no real employee is portrayed or quoted in invented dialogue. Your decisions and their consequences are a simulation, not a record of what Maersk did. Progress is saved on this computer, so you can close the app and continue later.
        </p>
      </div>
    </main>
  );
}
