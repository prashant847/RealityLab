import { useState, type ReactNode } from "react";
import type { Scene } from "../api/sims";
import { MeterBar } from "./Meter";

const BEDS = 24, STAFF = 10, CYL = 6;
const val = (s: Scene, id: string) => s.meters.find((m) => m.id === id)?.value ?? 0;

function WardBoard({ scene }: { scene: Scene }) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerHeight >= 820);
  const free = Math.round((val(scene, "capacity") / 100) * BEDS);
  const tired = Math.round(((100 - val(scene, "wellbeing")) / 100) * STAFF);
  const cyl = Math.round((val(scene, "oxygen") / 100) * CYL);
  const ppe = val(scene, "ppe");
  const strain = 100 - Math.round((val(scene, "capacity") + val(scene, "wellbeing")) / 2);
  return (
    <section className="cv-board" aria-label="Hospital status board">
      <div className="cv-board-head">
        <span className="cv-cross" aria-hidden="true" />
        <div><strong>Command centre</strong><span className="cv-sub">Riverside District Hospital · fictional</span></div>
        <span className={`cv-alert ${strain > 60 ? "hot" : strain > 40 ? "warm" : ""}`}>{strain > 60 ? "Critical strain" : strain > 40 ? "Under strain" : "Stable"}</span>
        <button type="button" className="cv-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide ward" : "Show ward"}</button>
      </div>
      {open && <>
      <svg className="cv-ecg" viewBox="0 0 300 36" role="img" aria-label="Heart monitor animation, decorative"><path d="M0 20 H60 l8 -14 l10 28 l8 -20 l6 6 H170 l8 -12 l10 24 l8 -18 l6 6 H300" fill="none" stroke="#2f7d94" strokeWidth="2" strokeDasharray="320" className="pv-ecg" /></svg>
      <div className="cv-grid">
        <div className="cv-block cv-wide">
          <h3>Beds <b>{free} of {BEDS} free</b></h3>
          <div className="cv-beds" role="img" aria-label={`${free} of ${BEDS} beds free`}>
            {Array.from({ length: BEDS }, (_, i) => <span key={i} className={i < BEDS - free ? "bed taken" : "bed"} />)}
          </div>
        </div>
        <div className="cv-block">
          <h3>Oxygen <b>{cyl}/{CYL}</b></h3>
          <div className="cv-cyl" role="img" aria-label={`Oxygen reserve ${val(scene, "oxygen")} percent`}>
            {Array.from({ length: CYL }, (_, i) => <span key={i} className={i < cyl ? "cyl full" : "cyl"} />)}
          </div>
        </div>
        <div className="cv-block">
          <h3>Protective kit <b>{ppe}%</b></h3>
          <div className="cv-stock" role="img" aria-label={`Protective equipment stock ${ppe} percent`}><span style={{ width: `${ppe}%` }} className={ppe < 35 ? "low" : ""} /></div>
          <h3 className="cv-gap">Team <b>{tired > 0 ? `${tired}/${STAFF} tired` : "rested"}</b></h3>
          <div className="cv-staff" role="img" aria-label={`${tired} of ${STAFF} staff showing fatigue`}>
            {Array.from({ length: STAFF }, (_, i) => <span key={i} className={i < tired ? "person tired" : "person"}><i /></span>)}
          </div>
        </div>
      </div>
      </>}
    </section>
  );
}

export function CovidStage({ scene, decision, log = [], deltas }: { scene: Scene; decision: ReactNode; deltas?: Record<string, number>; log?: { title: string; label: string; rating: string }[] }) {
  return (
    <div className="cv-layout">
      <aside className="cv-aside">
        <WardBoard scene={scene} />
        <section className="sim-meters sm-grid" aria-label="Indicators">
          {scene.meters.map((m) => <MeterBar key={m.id} m={m} delta={deltas?.[m.id]} />)}
        </section>
        {log.length > 0 && <section className="cv-log" aria-label="Shift log">
          <h3>Shift log</h3>
          <ol>{log.map((d, i) => <li key={i} title={d.label}><span className={`dot ${d.rating}`} aria-hidden="true" /><span><b>{d.title}</b>: {d.label}</span></li>)}</ol>
        </section>}
        <p className="sim-fine">Educational simulation, not medical training. All patients and staff are fictional.</p>
      </aside>
      <div className="cv-main">{decision}</div>
    </div>
  );
}
