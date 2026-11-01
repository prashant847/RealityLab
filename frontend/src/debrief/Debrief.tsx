import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Archivist } from "./Archivist";
import { Narrator, type Lang, type Style } from "./narrator";
import { useRetold } from "./retell";
import type { Scene, Tone } from "./script";
import { SoundToggle } from "../audio/useAudio";
import "./debrief.css";

const LANG_KEY = "rl.debriefLang";
const STYLE_KEY = "rl.debriefVoice";
const readStyle = (): Style => { try { return localStorage.getItem(STYLE_KEY) === "commanding" ? "commanding" : "calm"; } catch { return "calm"; } };
export const readLang = (): Lang => { try { return localStorage.getItem(LANG_KEY) === "hi" ? "hi" : "en"; } catch { return "en"; } };

const TEXT = {
  en: {
    kicker: "Your debrief", title: "The Archivist has read your ledger",
    intro: "They will talk you through each choice you made, what it led to, where it went wrong and what you could have done instead. It takes a few minutes. Captions are always shown.",
    begin: "Begin my debrief", written: "Read the written report instead", writtenShort: "Written report",
    play: "Pause", resume: "Resume", again: "Hear it again", prev: "Previous section", next: "Next section",
    pace: "Pace", voice: "Voice", calmVoice: "Calm", commandingVoice: "Commanding", slower: "Slower", normal: "Normal", faster: "Faster", captions: "Captions", transcript: "Transcript", language: "Language",
    sections: "Sections of the debrief", playback: "Playback", tone: { good: "good", mid: "so-so", bad: "poor", plain: "" },
    thinking: "The Archivist is turning the pages…", skipWait: "Skip the wait and use the short telling", told: "Told freshly by the Archivist, from your own ledger.", retell: "Hear it told another way",
    better: "A stronger option", noVoice: "No speech voice is available on this computer, so the debrief is shown as captions.",
    hint: (i: number, n: number, ch: string) => `Space pauses · ← → move between sections · C captions · Section ${i} of ${n}: ${ch}`,
  },
  hi: {
    kicker: "आपकी रिपोर्ट", title: "अभिलेखपाल ने आपका खाता पढ़ लिया है",
    intro: "वे आपके हर चुनाव के बारे में बताएँगे: उसका नतीजा क्या हुआ, कहाँ चूक हुई, और आप क्या बेहतर कर सकते थे। इसमें कुछ मिनट लगते हैं। उपशीर्षक हमेशा दिखते हैं।",
    begin: "मेरी रिपोर्ट सुनें", written: "इसके बजाय लिखित रिपोर्ट पढ़ें", writtenShort: "लिखित रिपोर्ट",
    play: "रोकें", resume: "जारी रखें", again: "फिर सुनें", prev: "पिछला भाग", next: "अगला भाग",
    pace: "गति", voice: "आवाज़", calmVoice: "शांत", commandingVoice: "रोबीली", slower: "धीमी", normal: "सामान्य", faster: "तेज़", captions: "उपशीर्षक", transcript: "पूरा पाठ", language: "भाषा",
    sections: "रिपोर्ट के भाग", playback: "चलाना", tone: { good: "अच्छा", mid: "मिला-जुला", bad: "ख़राब", plain: "" },
    thinking: "अभिलेखपाल पन्ने पलट रहे हैं…", skipWait: "इंतज़ार छोड़ें और छोटा वर्णन सुनें", told: "आपके अपने खाते से अभिलेखपाल ने नए सिरे से सुनाया।", retell: "इसे दूसरे ढंग से सुनें",
    better: "एक बेहतर विकल्प", noVoice: "इस कंप्यूटर पर कोई बोलने वाली आवाज़ उपलब्ध नहीं है, इसलिए रिपोर्ट उपशीर्षकों में दिखाई जा रही है।",
    hint: (i: number, n: number, ch: string) => `स्पेस से रोकें · ← → से भाग बदलें · C से उपशीर्षक · भाग ${i} / ${n}: ${ch}`,
  },
} as const;

/**
 * The debrief stage: the Archivist tells the student about their own choices, what they led to, and what to do better, in English or Hindi.
 * The captions are always shown, the full transcript is one button away, and the written report remains available.
 */
export function Debrief({ scenesFor, title, onWritten, children }: { scenesFor: (lang: Lang) => Scene[]; title: string; onWritten: () => void; children?: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const base = useMemo(() => scenesFor(lang), [scenesFor, lang]);
  const [started, setStarted] = useState(false);
  const { scenes, status: retold, skip: skipWait, again } = useRetold(base, lang, started);
  const [style, setStyleState] = useState<Style>(readStyle);
  const narrator = useMemo(() => new Narrator(scenes, lang, style), [scenes, lang, style]);
  useEffect(() => () => narrator.destroy(), [narrator]);
  const st = useSyncExternalStore(narrator.subscribe, narrator.getState, narrator.getState);
  const [captions, setCaptions] = useState(true);
  const [transcript, setTranscript] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [turn, setTurn] = useState(0);
  const getMouth = useCallback(() => narrator.mouth(), [narrator]);
  const scene = scenes[Math.min(st.scene, scenes.length - 1)];
  const T = TEXT[lang];

  useEffect(() => { setTurn((t) => (started ? t + 1 : t)); }, [st.scene, started]);
  useEffect(() => { narrator.rate = speed; }, [narrator, speed]);

  // switching language mid-debrief: carry on from the same section in the other language
  const resume = useRef<{ id: string; playing: boolean } | null>(null);
  const setLang = (next: Lang) => {
    if (next === lang) return;
    try { localStorage.setItem(LANG_KEY, next); } catch { /* not remembered */ }
    resume.current = started ? { id: scene.id, playing: true } : null;
    setLangState(next);
  };
  const setStyle = (next: Style) => {
    if (next === style) return;
    try { localStorage.setItem(STYLE_KEY, next); } catch { /* not remembered */ }
    resume.current = started ? { id: scene.id, playing: true } : null;
    setStyleState(next);
  };
  useEffect(() => {
    const r = resume.current;
    if (!r) return;
    resume.current = null;
    const i = Math.max(0, scenes.findIndex((s) => s.id === r.id));
    narrator.goto(i);
    if (r.playing) narrator.play();
  }, [narrator, scenes]);

  const [want, setWant] = useState(false);
  const begin = () => { setStarted(true); if (retold === "thinking") { skipWait(); setWant(true); } else narrator.play(); };   // never leave the student waiting: start with the short telling
  useEffect(() => { if (want && retold !== "thinking") { setWant(false); narrator.play(); } }, [want, retold, narrator]);
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

  const label = !started ? T.begin : st.ended ? T.again : st.playing ? T.play : T.resume;
  const tone = (t: Tone) => T.tone[t];
  const StylePick = () => (
    <label className="deb-speed">{T.voice}
      <select value={style} onChange={(e) => setStyle(e.target.value as Style)} aria-label={T.voice}>
        <option value="calm">{T.calmVoice}</option><option value="commanding">{T.commandingVoice}</option>
      </select></label>
  );
  const LangPick = ({ className }: { className?: string }) => (
    <div className={`deb-lang ${className ?? ""}`} role="radiogroup" aria-label={`${TEXT.en.language} / ${TEXT.hi.language}`}>
      {([["en", "English"], ["hi", "हिन्दी"]] as const).map(([k, l]) => <button key={k} type="button" role="radio" lang={k} aria-checked={lang === k} className={lang === k ? "on" : ""} onClick={() => setLang(k)}>{l}</button>)}
    </div>
  );

  return (
    <section className="deb" data-debrief lang={lang} aria-label={`${title}: your debrief with the Archivist`}>
      <div className="deb-stage">
        <Archivist mood={started ? scene.mood : "calm"} getMouth={getMouth} turn={turn} active={st.playing} />
        {!started && (
          <div className="deb-open">
            <div className="deb-pickers"><LangPick /><StylePick /></div>
            <p className="deb-kicker">{T.kicker}</p>
            <h2>{T.title}</h2>
            <p>{T.intro}</p>
            <div className="deb-open-acts">
              <button type="button" className="sim-btn sim-btn--primary deb-begin" onClick={begin} autoFocus>{T.begin}</button>
              {retold === "thinking" && <p className="deb-told" role="status"><span>{T.thinking}</span></p>}
              {retold === "claude" && <p className="deb-told"><span>{T.told}</span> <button type="button" className="deb-link" onClick={again}>{T.retell}</button></p>}
              <button type="button" className="sim-btn" onClick={onWritten}>{T.written}</button>
            </div>
            {children}
          </div>
        )}
        {started && scene.card && (
          <aside key={scene.id} className={`deb-card deb-card--${scene.mood}`} aria-label="What the Archivist is describing">
            <p className="deb-kicker">{scene.card.kicker}</p>
            <h3>{scene.card.heading}</h3>
            {scene.card.chips.length > 0 && <p className="deb-chips">{scene.card.chips.map((c, i) => <span key={i} className={`deb-chip deb-chip--${c.tone}`}>{c.text}</span>)}</p>}
            {scene.card.better && <p className="deb-better"><span>{T.better}</span>{scene.card.better}</p>}
            {scene.card.rows.length > 0 && <ul className="deb-rows">{scene.card.rows.map((r, i) => <li key={i}><span>{r.label}</span><b className={`tone-${r.tone}`}>{r.value}{tone(r.tone) ? <i className="sr-only"> ({tone(r.tone)})</i> : null}</b></li>)}</ul>}
          </aside>
        )}
        {started && captions && (
          <p className="deb-caption" aria-live="off">{scene.lines[Math.min(st.line, scene.lines.length - 1)]}</p>
        )}
        {started && st.engine === "timed" && <p className="deb-note" role="status">{T.noVoice}</p>}
      </div>

      {started && (
        <div className="deb-bar no-print">
          <div className="deb-ctl" role="group" aria-label={T.playback}>
            <button type="button" className="deb-ico" aria-label={T.prev} onClick={() => narrator.prev()} disabled={st.scene === 0 && st.line === 0}>⏮</button>
            <button type="button" className="sim-btn sim-btn--primary deb-play" onClick={() => (st.ended ? (narrator.goto(0), narrator.play()) : narrator.toggle())}>{label}</button>
            <button type="button" className="deb-ico" aria-label={T.next} onClick={() => narrator.next()} disabled={st.scene >= scenes.length - 1}>⏭</button>
          </div>
          <ol className="deb-chapters" aria-label={T.sections}>
            {scenes.map((s, i) => (
              <li key={s.id}><button type="button" className={i === st.scene ? "on" : i < st.scene ? "done" : ""} aria-current={i === st.scene ? "step" : undefined} onClick={() => { narrator.goto(i); if (!st.playing) narrator.play(); }} title={s.chapter}><span className="sr-only">{s.chapter}</span></button></li>
            ))}
          </ol>
          <div className="deb-ctl deb-ctl--end">
            <LangPick className="deb-lang--bar" />
            <StylePick />
            <label className="deb-speed">{T.pace}
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label={T.pace}>
                <option value={0.85}>{T.slower}</option><option value={1}>{T.normal}</option><option value={1.15}>{T.faster}</option>
              </select></label>
            <button type="button" className="deb-tog" aria-pressed={captions} onClick={() => setCaptions((c) => !c)}>{T.captions}</button>
            <button type="button" className="deb-tog" aria-pressed={transcript} onClick={() => setTranscript((t) => !t)}>{T.transcript}</button>
            <SoundToggle className="snd-toggle--rep" />
            <button type="button" className="sim-btn" onClick={onWritten}>{T.writtenShort}</button>
          </div>
        </div>
      )}
      {started && <p className="deb-hint sim-fine no-print">{T.hint(Math.min(st.scene + 1, scenes.length), scenes.length, scene.chapter)}</p>}

      {transcript && (
        <div className="deb-transcript" role="region" aria-label={`${T.transcript}`}>
          {scenes.map((s) => <div key={s.id}><h3>{s.chapter}</h3>{s.lines.map((l, i) => <p key={i}>{l}</p>)}</div>)}
        </div>
      )}
    </section>
  );
}
