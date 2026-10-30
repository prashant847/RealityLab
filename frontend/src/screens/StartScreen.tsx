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
          <p className="lede">The Last 24 Hours</p>
        </div>
      </div>
      <div className="start-body">
        <p>
          You are the emergency operations director of Meridian Industrial Systems, a company that makes
          medical-monitoring equipment. At 8:40 PM the inventory system goes dark, a monsoon floods the main
          route, and smoke appears near an electrical panel. Hospitals are waiting. A shipment must leave by 6:00 AM.
        </p>
        <p>
          Ten decisions. Every choice changes the world and what happens next. Some mistakes can still be recovered
          from; some cannot. If the situation becomes unrecoverable, you will be told exactly why, and you can rewind.
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
        <p className="muted fine">
          All characters, companies and events are fictional. Progress is saved on the server, so you can refresh or close this page and continue.
        </p>
      </div>
    </main>
  );
}
