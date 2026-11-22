import { useCallback, useEffect, useState } from "react";
import type { Certificate, SimReport, SimsApi } from "../api/sims";
import { ProReport } from "./ProReport";
import { SoundToggle } from "../audio/useAudio";
import { AppBar } from "../shell/AppBar";
import { Debrief } from "../debrief/Debrief";
import { newSeed, scriptForSim } from "../debrief/script";
import { scriptForSimHi } from "../debrief/hi";
import { scriptForSimHinglish } from "../debrief/hinglish";
import type { Lang } from "../debrief/narrator";
import "./sims.css";

const REPNAME: Record<string, string> = { blackout: "BLACKOUT", bhopal: "Bhopal", covid: "COVID-era Hospital", circuit: "Technical labs", surgery: "Technical labs" };
const crumbTo = (theme: string) => (theme === "circuit" || theme === "surgery" ? "#/labs" : theme === "gen" ? "#/generate" : `#/sim/${theme}`);

/** Shown on a report when this very run completed the set of best-choice runs for a certificate. */
function CertBanner({ api, runId }: { api: SimsApi; runId: string }) {
  const [cert, setCert] = useState<Certificate | null>(null);
  useEffect(() => { api.certificates().then((all) => setCert(all.find((c) => c.earned && c.run_ids.includes(runId)) ?? null)).catch(() => undefined); }, [api, runId]);
  if (!cert) return null;
  return <p className="cert-banner no-print" role="status">★ Certificate earned: {cert.title}<button type="button" className="hub-btn hub-btn--primary" onClick={() => { window.location.hash = `#/certificate/${cert.id}`; }}>View certificate</button></p>;
}

export function ReportView({ api, runId, onHome, onOpen }: { api: SimsApi; runId: string; onHome: () => void; onOpen: (simId: string, to?: string) => void }) {
  const [rep, setRep] = useState<SimReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("Candidate");
  const [view, setView] = useState<"debrief" | "written">("debrief");
  const [seed] = useState(newSeed);                  // a different way of saying things each time a debrief is opened, the same within it
  const scenesFor = useCallback((lang: Lang) => (rep ? (lang === "hi" ? scriptForSimHi(rep, seed) : lang === "hinglish" ? scriptForSimHinglish(rep, seed) : scriptForSim(rep, seed)) : []), [rep, seed]);
  useEffect(() => { api.report(runId).then(setRep).catch((e: Error) => setErr(e.message)); }, [api, runId]);
  useEffect(() => { Promise.resolve().then(() => api.profile()).then((p) => { if (p?.name?.trim()) setName(p.name.trim()); }).catch(() => undefined); }, [api]);

  if (err) return <main className="rep"><div className="sim-card sim-center"><h2>Report not available</h2><p>{err}</p><button type="button" className="sim-btn sim-btn--primary" onClick={onHome}>Back to all simulations</button></div></main>;
  if (!rep) return <main className="rep"><p className="sim-loading" role="status"><span className="sim-spin" aria-hidden="true" /> Preparing your report…</p></main>;
  const theme = (rep.profession ?? rep.simulation_id).split("_")[0];
  if (view === "debrief") return (
    <main className={`rep rep--${rep.profession ?? rep.simulation_id} rep--debrief`} id="main" tabIndex={-1}>
      <AppBar crumbs={[{ label: REPNAME[theme] ?? rep.simulation, to: crumbTo(theme) }, { label: "Report" }]}><SoundToggle /></AppBar>
      <CertBanner api={api} runId={runId} />
      <header className="rep-deb-head"><div><p className="sim-kicker">{rep.kind === "technical" ? "Technical lab report" : rep.kind === "generated" ? "Simulation report" : "Career experience report"}</p><h1>{rep.simulation}</h1></div></header>
      <Debrief scenesFor={scenesFor} title={rep.simulation} onWritten={() => setView("written")} />
    </main>
  );
  return (
    <main className={`rep rep--${rep.profession ?? rep.simulation_id} rep--pro`} id="main" tabIndex={-1}>
      <AppBar crumbs={[{ label: REPNAME[theme] ?? rep.simulation, to: crumbTo(theme) }, { label: "Report" }]}><button type="button" className="rep-act rep-act--archivist" onClick={() => setView("debrief")}>Hear the Archivist</button><button type="button" className="rep-act no-print" onClick={() => window.print()}>Print or save as PDF</button><SoundToggle /></AppBar>
      <CertBanner api={api} runId={runId} />
      <ProReport api={api} rep={rep} name={name} onOpen={onOpen} />
    </main>
  );
}
