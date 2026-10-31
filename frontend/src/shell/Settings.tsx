import { useState } from "react";
import type { Profile, SimsApi } from "../api/sims";
import { A11Y_KEY, TEXT_SIZES, setA11y, useA11y } from "../a11y/a11y";
import { canSpeak, speak } from "../a11y/speak";
import { audio } from "../audio/audio";
import { useAudioSettings } from "../audio/useAudio";

const TABS = [["profile", "Profile"], ["access", "Accessibility"], ["sound", "Sound"], ["about", "About and shortcuts"]] as const;
type Tab = (typeof TABS)[number][0];

function Switch({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="set-row">
      <span className="set-text"><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`set-switch${on ? " on" : ""}`} onClick={() => onChange(!on)}><i /></button>
    </div>
  );
}

export function Settings({ api, profile, onChange }: { api: SimsApi; profile: Profile; onChange: (p: Profile) => void }) {
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(profile.name);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const a = useA11y();
  const snd = useAudioSettings();
  const save = async (patch: Partial<Profile>) => {
    setErr(null);
    try { onChange(await api.saveProfile(patch)); setSaved(true); setTimeout(() => setSaved(false), 1800); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <main className="hub-main set" id="main" tabIndex={-1}>
      <header className="hub-head"><div><p className="hub-eyebrow">Make it yours</p><h1>Settings</h1></div></header>
      <nav className="set-tabs" role="tablist" aria-label="Settings sections">
        {TABS.map(([k, label]) => <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
      </nav>
      <section className="hub-panel set-panel" role="tabpanel" aria-label={TABS.find(([k]) => k === tab)![1]}>
        {tab === "profile" && (
          <form onSubmit={(e) => { e.preventDefault(); void save({ name }); }}>
            <h2>Your profile</h2>
            <label>Your name (shown on the home screen)<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
            <button type="submit" className="hub-btn hub-btn--primary">Save name</button>
            {saved && <span role="status" className="hub-ok"> Saved</span>}
          </form>)}

        {tab === "access" && (<>
          <h2>Accessibility</h2>
          <fieldset className="set-group"><legend>Text size</legend>
            <p className="set-hint">Makes everything larger and reflows the screen. In the desktop app you can also press Ctrl and + or −.</p>
            <div className="set-choices" role="radiogroup" aria-label="Text size">
              {TEXT_SIZES.map((s) => <button key={s} type="button" role="radio" aria-checked={a.textSize === s} className={a.textSize === s ? "on" : ""} onClick={() => setA11y({ textSize: s })}>{s}%</button>)}
            </div>
          </fieldset>
          <fieldset className="set-group"><legend>Contrast</legend>
            <div className="set-choices" role="radiogroup" aria-label="Contrast">
              <button type="button" role="radio" aria-checked={a.contrast === "normal"} className={a.contrast === "normal" ? "on" : ""} onClick={() => setA11y({ contrast: "normal" })}>Normal</button>
              <button type="button" role="radio" aria-checked={a.contrast === "high"} className={a.contrast === "high" ? "on" : ""} onClick={() => setA11y({ contrast: "high" })}>High contrast</button>
            </div>
          </fieldset>
          <div className="set-grid">
          <Switch label="Colour-blind friendly colours" hint="Uses blue and orange instead of green and red. Results are always also written in words." on={a.colorblind} onChange={(v) => setA11y({ colorblind: v })} />
          <Switch label="Easy-reading font" hint="A plain, wide-spaced font with looser lines, which many people with dyslexia find easier." on={a.easyFont} onChange={(v) => setA11y({ easyFont: v })} />
          <Switch label="Larger buttons and more space" hint="Bigger targets that are easier to hit with a mouse, trackpad or touch." on={a.bigTargets} onChange={(v) => setA11y({ bigTargets: v })} />
          <Switch label="Reduce motion and animation" hint="Stops screens easing in, meters sliding and other movement." on={profile.reduce_motion} onChange={(v) => void save({ reduce_motion: v })} />
          <Switch label="Read-aloud buttons" hint={canSpeak() ? "Adds a Read aloud button (or press R) that speaks the screen with your computer's voice." : "Your computer has no speech voice available."} on={a.readAloud} onChange={(v) => setA11y({ readAloud: v })} />
          {a.readAloud && (
            <div className="set-row"><label className="set-text" htmlFor="rate"><b>Reading speed</b><small>{a.speechRate.toFixed(1)}×</small></label>
              <span className="set-slider"><input id="rate" type="range" min="0.6" max="1.4" step="0.1" value={a.speechRate} onChange={(e) => setA11y({ speechRate: Number(e.target.value) })} />
                <button type="button" className="hub-btn" onClick={() => speak("This is how the read aloud voice will sound.")}>Test voice</button></span></div>)}
          </div>
          {err && <p role="alert" className="hub-err">{err}</p>}
        </>)}

        {tab === "sound" && (<>
          <h2>Sound</h2>
          <p className="set-hint">Quiet, calm music and soft sound effects. Nothing important is ever communicated by sound alone, so you can turn it all off and lose nothing.</p>
          <Switch label="Music" hint="Slow ambient music that changes gently with each simulation." on={snd.music} onChange={(v) => { audio.start(); audio.update({ music: v }); }} />
          <div className="set-row"><label className="set-text" htmlFor="mv"><b>Music volume</b><small>{Math.round(snd.musicVolume * 100)}%</small></label>
            <span className="set-slider"><input id="mv" type="range" min="0" max="1" step="0.05" value={snd.musicVolume} disabled={!snd.music} onChange={(e) => audio.update({ musicVolume: Number(e.target.value) })} /></span></div>
          <Switch label="Sound effects" hint="Soft chimes for choices, decisions and results." on={snd.sfx} onChange={(v) => { audio.start(); audio.update({ sfx: v }); if (v) audio.sfx("confirm"); }} />
          <div className="set-row"><label className="set-text" htmlFor="sv"><b>Effects volume</b><small>{Math.round(snd.sfxVolume * 100)}%</small></label>
            <span className="set-slider"><input id="sv" type="range" min="0" max="1" step="0.05" value={snd.sfxVolume} disabled={!snd.sfx} onChange={(e) => audio.update({ sfxVolume: Number(e.target.value) })} />
              <button type="button" className="hub-btn" disabled={!snd.sfx} onClick={() => { audio.start(); audio.sfx("good"); }}>Play a sample</button></span></div>
        </>)}

        {tab === "about" && (<div className="set-about">
          <h2>About RealityLab AI</h2>
          <p>Experience your future before you choose it. Your progress, decisions, reports and settings are saved on this computer only, and nothing is sent anywhere.</p>
          <p>BLACKOUT follows the documented 2017 NotPetya attack, with scenes labelled as documented, reconstructed or simulation. The Bhopal simulation treats a real tragedy with care and separates the record from a fictional exercise. The hospital simulation is fictional and educational, not medical training.</p>
          <h3>Keyboard shortcuts</h3>
          <ul className="set-keys">
            <li><kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> move between controls · <kbd>Enter</kbd> or <kbd>Space</kbd> press</li>
            <li><kbd>A</kbd>–<kbd>C</kbd> (or <kbd>1</kbd>–<kbd>3</kbd>) choose an option · <kbd>Enter</kbd> confirm and continue</li>
            <li><kbd>←</kbd> back to the situation · <kbd>→</kbd> next comic panel · <kbd>Esc</kbd> skip the welcome tour</li>
            <li><kbd>R</kbd> read this screen aloud (when read-aloud is on) · <kbd>Ctrl</kbd>+<kbd>+</kbd>/<kbd>−</kbd>/<kbd>0</kbd> text size</li>
          </ul>
          <h3>Accessibility</h3>
          <p>Every screen works with the keyboard alone and with a screen reader. Results are always written in words as well as colour, meters announce their values, and nothing depends on sound or on a timer. Settings are stored under “{A11Y_KEY}” on this computer.</p>
        </div>)}
      </section>
    </main>
  );
}
