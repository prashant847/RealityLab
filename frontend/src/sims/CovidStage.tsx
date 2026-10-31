import type { ReactNode } from "react";
import type { Scene } from "../api/sims";
import { MeterBar } from "./Meter";

const BEDS = 24, STAFF = 10, CYL = 6;
const val = (s: Scene, id: string) => s.meters.find((m) => m.id === id)?.value ?? 0;

function WardBoard({ scene }: { scene: Scene }) {
  const free = Math.round((val(scene, "capacity") / 100) * BEDS);
  const tired = Math.round(((100 - val(scene, "wellbeing")) / 100) * STAFF);
  const cyl = Math.round((val(scene, "oxygen") / 100) * CYL);
  const ppe = val(scene, "ppe");
  return (
    <section className="cv-board" aria-label="Hospital status board">
      <div className="cv-board-head"><span className="cv-live" aria-hidden="true" /> Command centre <span className="cv-sub">Riverside District Hospital · fictional</span></div>
      <div className="cv-block">
        <h3>Beds <b>{free} of {BEDS} free</b></h3>
        <div className="cv-beds" role="img" aria-label={`${free} of ${BEDS} beds free`}>
          {Array.from({ length: BEDS }, (_, i) => <span key={i} className={i < BEDS - free ? "bed taken" : "bed"} />)}
        </div>
      </div>
      <div className="cv-block">
        <h3>Oxygen <b>{cyl} of {CYL} cylinders’ worth</b></h3>
        <div className="cv-cyl" role="img" aria-label={`Oxygen reserve ${val(scene, "oxygen")} percent`}>
          {Array.from({ length: CYL }, (_, i) => <span key={i} className={i < cyl ? "cyl full" : "cyl"} />)}
        </div>
      </div>
      <div className="cv-block">
        <h3>Protective equipment <b>{ppe}%</b></h3>
        <div className="cv-stock" role="img" aria-label={`Protective equipment stock ${ppe} percent`}><span style={{ width: `${ppe}%` }} className={ppe < 35 ? "low" : ""} /></div>
      </div>
      <div className="cv-block">
        <h3>Team on shift <b>{tired > 0 ? `${tired} of ${STAFF} showing fatigue` : "rested"}</b></h3>
        <div className="cv-staff" role="img" aria-label={`${tired} of ${STAFF} staff showing fatigue`}>
          {Array.from({ length: STAFF }, (_, i) => <span key={i} className={i < tired ? "person tired" : "person"}><i /></span>)}
        </div>
      </div>
    </section>
  );
}

export function CovidStage({ scene, decision }: { scene: Scene; decision: ReactNode }) {
  const done = scene.status === "completed";
  return (
    <div className="cv-layout">
      <aside className="cv-aside">
        <WardBoard scene={scene} />
        <section className="sim-card sim-meters" aria-label="Indicators">
          <h2>Hospital indicators</h2>
          {scene.meters.map((m) => <MeterBar key={m.id} m={m} />)}
        </section>
        <p className="sim-fine">{done ? "Final position. " : ""}Educational simulation, not medical training. All patients and staff are fictional.</p>
      </aside>
      <div className="cv-main">{decision}</div>
    </div>
  );
}
