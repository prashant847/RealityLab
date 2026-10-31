import { useEffect, useState } from "react";
import type { LibraryItem, SimsApi } from "../api/sims";
import { Preview } from "./Previews";
import { SoundToggle } from "../audio/useAudio";
import { setIntent, type Intent } from "../shell/intent";
import "./sims.css";

type Prof = "blackout" | "bhopal" | "covid";
const THEME_TITLE = { blackout: "BLACKOUT", bhopal: "Bhopal", covid: "COVID-era Hospital" } as const;
const crisisRoute = (p: string) => (p === "blackout" ? "#/play/blackout" : `#/crisis/${p}`);

function Top({ profession, label, onHome }: { profession: Prof; label: string; onHome: () => void }) {
  return (
    <header className="sim-top">
      <button type="button" className="sim-btn sim-btn--ghost" onClick={onHome}>← All simulations</button>
      <strong className="sim-name">{THEME_TITLE[profession]}</strong>
      <span className="sim-spacer" /><span className="sim-pill">{label}</span><SoundToggle />
    </header>
  );
}

function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let live = true; setData(null); setErr(null); fn().then((d) => { if (live) setData(d); }).catch((e: Error) => { if (live) setErr(e.message); }); return () => { live = false; }; }, deps);   // eslint-disable-line react-hooks/exhaustive-deps
  return { data, err };
}

/** One profession's journey: a normal day first, then the crisis. They are two separate parts. */
export function PathPage({ api, profession, onHome }: { api: SimsApi; profession: Prof; onHome: () => void }) {
  const { data, err } = useAsync<LibraryItem | undefined>(() => api.library().then((l) => l.find((x) => x.id === profession)), [api, profession]);
  const go = (h: string) => { window.location.hash = h; };
  const open = (h: string, intent?: Intent) => { if (intent) setIntent(intent); go(h); };
  const wd = data?.workday;
  const wdDone = wd?.status === "completed";
  const clear = () => { if (profession === "blackout" && data?.status === "completed") { try { localStorage.removeItem("realitylab.simulationId"); } catch { /* ignore */ } } };
  return (
    <div className={`sim sim--${profession} pt`}>
      <Top profession={profession} label="Your path" onHome={onHome} />
      <main className="sim-main" id="main" tabIndex={-1}>
        {err && <div className="sim-card sim-center"><h2>Something went wrong</h2><p>{err}</p></div>}
        {!data && !err && <p className="sim-loading" role="status"><span className="sim-spin" aria-hidden="true" /> Loading…</p>}
        {data && wd && (
          <div className="pt-wrap">
            <div className="pt-hero"><div className="pt-art"><Preview id={profession} /></div>
              <div><p className="sim-kicker">{data.domain}</p><h1>{data.title}</h1><p className="sim-lede">{data.tagline}</p>
                <p className="sim-meta"><b>Your role:</b> {data.role}</p></div></div>
            <ol className="pt-steps" aria-label="Your path">
              <li className={`pt-step pt-step--${wd.status}`}>
                <span className="pt-num" aria-hidden="true">1</span><h2>A normal day</h2>
                <p>{wd.tagline}</p><p className="sim-fine">About {wd.minutes} minutes · {wd.rounds} steps · nothing is on fire</p>
                {wd.progress && <p className="pt-status">{wd.progress}</p>}
                <div className="pt-btns">
                  {wd.status === "active" ? (<>
                    <button type="button" className="sim-btn sim-btn--primary" onClick={() => open(`#/workday/${profession}`, "continue")}>Continue where you left off</button>
                    <button type="button" className="sim-btn" onClick={() => open(`#/workday/${profession}`, "new")}>Start new</button>
                  </>) : (<>
                    <button type="button" className="sim-btn sim-btn--primary" onClick={() => open(`#/workday/${profession}`)}>{wd.status === "completed" ? "Play the day again" : "Start the day"}</button>
                    {wd.status === "completed" && wd.run_id && <button type="button" className="sim-btn" onClick={() => go(`#/report/${wd.run_id}`)}>View report</button>}
                  </>)}
                </div>
              </li>
              <li className={`pt-step pt-step--${data.status}`}>
                <span className="pt-num" aria-hidden="true">2</span><h2>The crisis</h2>
                <p>{data.description}</p><p className="sim-fine">About {data.minutes} minutes{wdDone ? ` · you start with ${wd?.prep_earned ?? 0} of ${wd?.prep_total ?? 0} things your day set up` : " · play the normal day first for a head start"}</p>
                {data.progress && <p className="pt-status">{data.progress}</p>}
                <div className="pt-btns">
                  {data.status === "active" ? (<>
                    <button type="button" className="sim-btn sim-btn--primary" onClick={() => open(crisisRoute(profession), "continue")}>Continue where you left off</button>
                    <button type="button" className="sim-btn" onClick={() => open(crisisRoute(profession), "new")}>Start new</button>
                  </>) : (<>
                    <button type="button" className="sim-btn sim-btn--primary" onClick={() => { clear(); open(crisisRoute(profession), data.status === "completed" ? "new" : undefined); }}>{data.status === "completed" ? "Play the crisis again" : wdDone ? "Begin the crisis" : "Start the crisis"}</button>
                    {data.status === "completed" && data.id !== "blackout" && data.run_id && <button type="button" className="sim-btn" onClick={() => go(`#/report/${data.run_id}`)}>View report</button>}
                  </>)}
                </div>
              </li>
            </ol>
            <p className="sim-fine pt-foot">Play the day first for the full story: the people you meet and the things you set up come back in the crisis. Once you have finished both parts, see how you did in <a href="#/compare">Compare careers</a>.</p>
          </div>)}
      </main>
    </div>
  );
}
