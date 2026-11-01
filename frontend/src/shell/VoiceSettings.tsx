import { useEffect, useState } from "react";
import { setA11y, useA11y } from "../a11y/a11y";
import { refreshVoices, speak } from "../a11y/speak";
import { voiceStatus } from "../audio/voice";

/** Story voices on or off, and the ElevenLabs key that turns on the human voices (it is kept on this computer only). */
export function VoiceSettings() {
  const a = useA11y();
  const [human, setHuman] = useState<boolean | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { void voiceStatus(true).then((s) => setHuman(s.human)); }, []);
  const after = async (text: string, ok: boolean) => { await refreshVoices(); const s = await voiceStatus(true); setHuman(s.human); setMsg({ ok, text }); };
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/tts/key", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: key.trim() }) });
      if (r.ok) { setKey(""); await after("Saved. Human voices are on.", true); speak("Human voices are on. This is how I sound when I read to you."); }
      else setMsg({ ok: false, text: r.status === 400 ? "ElevenLabs did not accept that key. Check it and try again." : "The key could not be saved." });
    } catch { setMsg({ ok: false, text: "The app's local service is not reachable." }); }
    setBusy(false);
  };
  const forget = async () => { setBusy(true); try { await fetch("/api/tts/key", { method: "DELETE" }); await after("The key was removed. The offline voices are used.", true); } catch { setMsg({ ok: false, text: "Could not remove the key." }); } setBusy(false); };
  return (
    <section className="set-voices" aria-labelledby="sv-h">
      <h3 id="sv-h">Voices</h3>
      <label className="set-check"><input type="checkbox" checked={a.comicNarrator} onChange={(e) => setA11y({ comicNarrator: e.target.checked })} />
        <span><b>Comic narrator</b><small>The tired narrator who appears in the corner of comic pages and reads them aloud. Turn it off and the pages are only written. The reactions after your choices are not affected.</small></span></label>
      <label className="set-check"><input type="checkbox" checked={a.storyVoices} onChange={(e) => setA11y({ storyVoices: e.target.checked })} />
        <span><b>Story voices</b><small>The characters in a reaction scene, the comic narrator and the Archivist speak aloud.</small></span></label>
      <div className="set-row"><span className="set-text"><b>Human voices</b>
        <small>{human === null ? "Checking…" : human ? "On. Narration, characters and read-aloud use real human voices (ElevenLabs)." : "Off. Paste an ElevenLabs API key to hear human voices instead of the offline ones. The key stays on this computer."}</small></span>
        {human ? <button type="button" className="hub-btn" disabled={busy} onClick={() => void forget()}>Forget key</button> : (
          <span className="set-slider"><input type="password" autoComplete="off" spellCheck={false} aria-label="ElevenLabs API key" placeholder="ElevenLabs API key" value={key} onChange={(e) => setKey(e.target.value)} />
            <button type="button" className="hub-btn hub-btn--primary" disabled={busy || key.trim().length < 16} onClick={() => void save()}>Save key</button></span>)}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "hub-ok" : "hub-err"}>{msg.text}</p>}
    </section>
  );
}
