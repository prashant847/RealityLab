import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Archivist } from "./Archivist";
import { Narrator } from "./narrator";
import type { Scene, Tone } from "./script";
import { SoundToggle } from "../audio/useAudio";
import "./debrief.css";

const TONE_LABEL: Record<Tone, string> = { good: "good", mid: "so-so", bad: "poor", plain: "" };

/**
 * The debrief stage: the Archivist tells the student about their own choices, what they led to, and what to do better. The captions are always
 * shown, the full transcript is one button away, and the written report remains available.
 */
export function Debrief({ scenes, title, onWritten, children }: { scenes: Scene[]; title: string; onWritten: () => void; children?: React.ReactNode }) {
  const narrator = useMemo(() => new Narrator(scenes), [scenes]);
  useEffect(() => () => narrator.destroy(), [narrator]);
  const st = useSyncExternalStore(narrator.subscribe, narrator.getState, narrator.getState);
  const [started, setStarted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [transcript, setTranscript] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [turn, setTurn] = useState(0);
  const getMouth = useCallback(() => narrator.mouth(), [narrator]);
  const scene = scenes[Math.min(st.scene, scenes.length - 1)];
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => { setTurn((t) => (started ? t + 1 : t)); }, [st.scene, started]);
  useEffect(() => { narrator.rate = speed; }, [narrator, speed]);

  const begin = () => { setStarted(true); narrator.play(); };
  useEffect(() => {
    if (!started) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === " " && t && (t.tagName === "BUTTON" || t.tagName === "A")) return;
      if (e.key === " " || e.key.toLowerCase() === "k") { e.preventDefault(); narrator.toggle(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); narrator.next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); narrator.prev(); }
      else if (e.key.toLowerCase() === "c") setCaptions((c) => !c);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [started, narrator]);

  const speaking = st.playing;
  const label = !started ? "Begin" : st.ended ? "Hear it again" : st.playing ? "Pause" : "Resume";

  return (
    <section className="deb" data-debrief ref={rootRef} aria-label={`${title}: your debrief with the Archivist`}>
      <div className="deb-stage">
        <Archivist mood={started ? scene.mood : "calm"} getMouth={getMouth} turn={turn} active={speaking} />
        {!started && (
          <div className="deb-open">
            <p className="deb-kicker">Your debrief</p>
            <h2>The Archivist has read your ledger</h2>
            <p>They will talk you through each choice you made, what it led to, where it went wrong and what you could have done instead. It takes a few minutes. Captions are always shown.</p>
            <div className="deb-open-acts">
              <button type="button" className="sim-btn sim-btn--primary deb-begin" onClick={begin} autoFocus>Begin my debrief</button>
              <button type="button" className="sim-btn" onClick={onWritten}>Read the written report instead</button>
            </div>
            {children}
          </div>
        )}
        {started && scene.card && (
          <aside key={scene.id} className={`deb-card deb-card--${scene.mood}`} aria-label="What the Archivist is describing">
            <p className="deb-kicker">{scene.card.kicker}</p>
            <h3>{scene.card.heading}</h3>
            {scene.card.chips.length > 0 && <p className="deb-chips">{scene.card.chips.map((c, i) => <span key={i} className={`deb-chip deb-chip--${c.tone}`}>{c.text}</span>)}</p>}
            {scene.card.better && <p className="deb-better"><span>A stronger option</span>{scene.card.better}</p>}
            {scene.card.rows.length > 0 && <ul className="deb-rows">{scene.card.rows.map((r, i) => <li key={i}><span>{r.label}</span><b className={`tone-${r.tone}`}>{r.value}{TONE_LABEL[r.tone] ? <i className="sr-only"> ({TONE_LABEL[r.tone]})</i> : null}</b></li>)}</ul>}
          </aside>
        )}
        {started && captions && (
          <p className="deb-caption" aria-live="off">{scene.lines[Math.min(st.line, scene.lines.length - 1)]}</p>
        )}
        {started && st.engine === "timed" && <p className="deb-note" role="status">No speech voice is available on this computer, so the debrief is shown as captions.</p>}
      </div>

      {started && (
        <div className="deb-bar no-print">
          <div className="deb-ctl" role="group" aria-label="Playback">
            <button type="button" className="deb-ico" aria-label="Previous section" onClick={() => narrator.prev()} disabled={st.scene === 0 && st.line === 0}>⏮</button>
            <button type="button" className="sim-btn sim-btn--primary deb-play" onClick={() => (st.ended ? (narrator.goto(0), narrator.play()) : narrator.toggle())}>{label}</button>
            <button type="button" className="deb-ico" aria-label="Next section" onClick={() => narrator.next()} disabled={st.scene >= scenes.length - 1}>⏭</button>
          </div>
          <ol className="deb-chapters" aria-label="Sections of the debrief">
            {scenes.map((s, i) => (
              <li key={s.id}><button type="button" className={i === st.scene ? "on" : i < st.scene ? "done" : ""} aria-current={i === st.scene ? "step" : undefined} onClick={() => { narrator.goto(i); if (!st.playing) narrator.play(); }} title={s.chapter}><span className="sr-only">{s.chapter}</span></button></li>
            ))}
          </ol>
          <div className="deb-ctl deb-ctl--end">
            <label className="deb-speed">Pace
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Speaking pace">
                <option value={0.85}>Slower</option><option value={1}>Normal</option><option value={1.15}>Faster</option>
              </select></label>
            <button type="button" className="deb-tog" aria-pressed={captions} onClick={() => setCaptions((c) => !c)}>Captions</button>
            <button type="button" className="deb-tog" aria-pressed={transcript} onClick={() => setTranscript((t) => !t)}>Transcript</button>
            <SoundToggle className="snd-toggle--rep" />
            <button type="button" className="sim-btn" onClick={onWritten}>Written report</button>
          </div>
        </div>
      )}
      {started && <p className="deb-hint sim-fine no-print">Space pauses · ← → move between sections · C captions · Section {Math.min(st.scene + 1, scenes.length)} of {scenes.length}: {scene.chapter}</p>}

      {transcript && (
        <div className="deb-transcript" role="region" aria-label="Transcript of the debrief">
          {scenes.map((s) => <div key={s.id}><h3>{s.chapter}</h3>{s.lines.map((l, i) => <p key={i}>{l}</p>)}</div>)}
        </div>
      )}
    </section>
  );
}
