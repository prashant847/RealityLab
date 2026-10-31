import { useEffect, useState } from "react";
import type { IntervalView, LibraryItem, SimsApi } from "../api/sims";
import { Preview } from "./Previews";
import "./sims.css";

type Prof = "blackout" | "bhopal" | "covid";
const THEME_TITLE = { blackout: "BLACKOUT", bhopal: "Bhopal", covid: "COVID-era Hospital" } as const;
const BADGE = { full: "✓", part: "½", missed: "✗" } as const;
const STATUS_WORD = { full: "Set up", part: "Half set up", missed: "Not set up" } as const;
const crisisRoute = (p: string) => (p === "blackout" ? "#/play/blackout" : `#/crisis/${p}`);

function Top({ profession, label, onHome }: { profession: Prof; label: string; onHome: () => void }) {
  return (
    <header className="sim-top">
      <button type="button" className="sim-btn sim-btn--ghost" onClick={onHome}>← All simulations</button>
      <strong className="sim-name">{THEME_TITLE[profession]}</strong>
      <span className="sim-spacer" /><span className="sim-pill">{label}</span>
    </header>
  );
}

function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let live = true; setData(null); setErr(null); fn().then((d) => { if (live) setData(d); }).catch((e: Error) => { if (live) setErr(e.message); }); return () => { live = false; }; }, deps);   // eslint-disable-line react-hooks/exhaustive-deps
  return { data, err };
}

/** The interval between the ordinary day and the crisis: a short story beat, and an honest list of what the workday set up. */
export function IntervalPage({ api, profession, onHome }: { api: SimsApi; profession: Prof; onHome: () => void }) {
  const { data, err } = useAsync<IntervalView>(() => api.interval(profession), [api, profession]);
  const go = (h: string) => { window.location.hash = h; };
  return (
    <div className={`sim sim--${profession} iv`}>
      <Top profession={profession} label="Interval" onHome={onHome} />
      <main className="sim-main">
        {err && <div className="sim-card sim-center"><h2>Something went wrong</h2><p>{err}</p></div>}
        {!data && !err && <p className="sim-loading" role="status"><span className="sim-spin" aria-hidden="true" /> Loading…</p>}
        {data && (
          <div className="iv-grid">
            <section className="sim-card iv-story" aria-labelledby="iv-h">
              <p className="sim-kicker">The interval</p>
              <h1 id="iv-h">Some time later…</h1>
              {data.narrative.map((t, i) => <p key={i} className="iv-p">{t}</p>)}
              <div className="sim-actions iv-actions">
                {data.workday_done ? (<>
                  <button type="button" className="sim-btn sim-btn--primary sim-btn--lg" onClick={() => go(crisisRoute(profession))}>Begin the crisis</button>
                  <button type="button" className="sim-btn" onClick={() => go(`#/workday/${profession}`)}>Replay the workday</button>
                </>) : (<>
                  <button type="button" className="sim-btn sim-btn--primary sim-btn--lg" onClick={() => go(`#/workday/${profession}`)}>Do the ordinary day first</button>
                  <button type="button" className="sim-btn" onClick={() => go(crisisRoute(profession))}>Skip to the crisis</button>
                </>)}
              </div>
            </section>
            <section className="sim-card iv-prep" aria-labelledby="ivp-h">
              <div className="iv-prep-head">
                <h2 id="ivp-h">{data.workday_done ? "What your workday set up" : "What a workday could set up"}</h2>
                <span className="iv-count" aria-label={`${data.earned} of ${data.total} set up`}><b>{data.earned}</b>/{data.total}</span>
              </div>
              {!data.workday_done && <p className="sim-fine iv-note">You have not played the ordinary day yet. The crisis would begin with no head start. Each item below is something the day lets you do.</p>}
              <ul className="prep-list prep-list--tight">
                {data.items.map((p) => (
                  <li key={p.flag} className={`prep--${p.status}`}>
                    <span className="prep-badge" aria-label={STATUS_WORD[p.status]}>{BADGE[p.status]}</span>
                    <div><b>{p.label}</b><span>{p.status === "missed" && !data.workday_done ? `Earned at: ${p.task}` : p.text}</span>{p.effects.length > 0 && <em>{p.effects.join(" · ")}</em>}</div>
                  </li>))}
              </ul>
            </section>
          </div>)}
      </main>
    </div>
  );
}

/** One profession's journey: the ordinary day, the interval, then the crisis. */
export function PathPage({ api, profession, onHome }: { api: SimsApi; profession: Prof; onHome: () => void }) {
  const { data, err } = useAsync<LibraryItem | undefined>(() => api.library().then((l) => l.find((x) => x.id === profession)), [api, profession]);
  const go = (h: string) => { window.location.hash = h; };
  const wd = data?.workday;
  const wdDone = wd?.status === "completed";
  const clear = () => { if (profession === "blackout" && data?.status === "completed") { try { localStorage.removeItem("realitylab.simulationId"); } catch { /* ignore */ } } };
  return (
    <div className={`sim sim--${profession} pt`}>
      <Top profession={profession} label="Your path" onHome={onHome} />
      <main className="sim-main">
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
                  <button type="button" className="sim-btn sim-btn--primary" onClick={() => go(`#/workday/${profession}`)}>{wd.status === "active" ? "Continue the day" : wd.status === "completed" ? "Replay the day" : "Start the day"}</button>
                  {wd.status === "completed" && wd.run_id && <button type="button" className="sim-btn" onClick={() => go(`#/report/${wd.run_id}`)}>View report</button>}
                </div>
              </li>
              <li className={`pt-step pt-step--${wdDone ? "completed" : "locked"}`}>
                <span className="pt-num" aria-hidden="true">2</span><h2>The interval</h2>
                <p>Time passes, and something changes. See what your day set up for what comes next.</p>
                <div className="pt-btns"><button type="button" className="sim-btn" onClick={() => go(`#/interval/${profession}`)}>{wdDone ? "See what it set up" : "Preview the interval"}</button></div>
              </li>
              <li className={`pt-step pt-step--${data.status}`}>
                <span className="pt-num" aria-hidden="true">3</span><h2>The crisis</h2>
                <p>{data.description}</p><p className="sim-fine">About {data.minutes} minutes{wdDone ? " · with your head start" : " · no head start yet"}</p>
                {data.progress && <p className="pt-status">{data.progress}</p>}
                <div className="pt-btns">
                  <button type="button" className="sim-btn sim-btn--primary" onClick={() => { clear(); go(data.status === "active" || !wdDone ? crisisRoute(profession) : `#/interval/${profession}`); }}>
                    {data.status === "active" ? "Continue the crisis" : data.status === "completed" ? "Play the crisis again" : wdDone ? "Go to the interval" : "Skip to the crisis"}</button>
                  {data.status === "completed" && data.id !== "blackout" && data.run_id && <button type="button" className="sim-btn" onClick={() => go(`#/report/${data.run_id}`)}>View report</button>}
                </div>
              </li>
            </ol>
            <p className="sim-fine pt-foot">Play the day first for the full story: the people you meet and the things you set up come back in the crisis. You can compare what you experienced in <a href="#/compare">Compare careers</a>.</p>
          </div>)}
      </main>
    </div>
  );
}
