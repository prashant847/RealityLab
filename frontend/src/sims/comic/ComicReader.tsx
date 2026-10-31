import { useEffect, useState } from "react";
import type { ComicPage } from "./firstSurge";
import { ArtContext } from "./ink";
import { speak, stopSpeaking, canSpeak } from "../../a11y/speak";
import { useA11y } from "../../a11y/a11y";
import "./comic.css";

/** Reads a comic one page at a time. ← → turn the page, Enter on the last page continues, and Skip is always there. Each page has a text description for screen readers. */
/** Finds a finished picture for each page, if one has been added to public/comic/<dir>/. */
function useArt(pages: ComicPage[], dir: string): Record<string, string> {
  const [art, setArt] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!dir || typeof Image === "undefined") return;
    let live = true;
    for (const p of pages) {
      const tries = ["png", "jpg", "webp"].map((x) => `/comic/${dir}/${p.id}.${x}`);
      const next = (k: number) => { if (k >= tries.length) return; const im = new Image(); im.onload = () => { if (live) setArt((a) => ({ ...a, [p.id]: tries[k] })); }; im.onerror = () => next(k + 1); im.src = tries[k]; };
      next(0);
    }
    return () => { live = false; };
  }, [pages, dir]);
  return art;
}

export function ComicReader({ pages, title, onDone, dir = "" }: { pages: ComicPage[]; title: string; onDone: () => void; dir?: string }) {
  const [i, setI] = useState(0);
  const art = useArt(pages, dir);
  const a = useA11y();
  const last = i === pages.length - 1;
  const go = (n: number) => { stopSpeaking(); setI(Math.max(0, Math.min(pages.length - 1, n))); };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) return;
      const onControl = !!t && (t.tagName === "BUTTON" || t.tagName === "A");                 // Enter on a button must still press that button
      if (e.key === "ArrowRight" || (e.key === "Enter" && !onControl)) { e.preventDefault(); if (last) onDone(); else go(i + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
      else if (e.key === "Escape") { e.preventDefault(); onDone(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  useEffect(() => () => stopSpeaking(), []);
  const page = pages[i];
  return (
    <section className="ck" aria-label={`${title}: the comic`}>
      <div className="ck-stage" key={page.id} role="group" aria-roledescription="comic page" aria-label={`Page ${i + 1} of ${pages.length}. ${page.alt}`}>
        <ArtContext.Provider value={art[page.id] ?? null}>{page.render()}</ArtContext.Provider>
      </div>
      <div className="ck-bar">
        <button type="button" className="sim-btn" onClick={() => go(i - 1)} disabled={i === 0}>← Back</button>
        <ol className="ck-dots" aria-label="Comic pages">{pages.map((p, k) => <li key={p.id}><button type="button" className={k === i ? "on" : k < i ? "done" : ""} aria-label={`Page ${k + 1}`} aria-current={k === i ? "page" : undefined} onClick={() => go(k)} /></li>)}</ol>
        {a.readAloud && canSpeak() && <button type="button" className="sim-btn" onClick={() => speak(page.spoken)}>Read this page aloud</button>}
        <span className="sim-spacer" />
        <button type="button" className="sim-btn sim-btn--ghost" onClick={onDone}>Skip the comic</button>
        {last ? <button type="button" className="sim-btn sim-btn--primary" onClick={onDone}>Make your decision →</button> : <button type="button" className="sim-btn sim-btn--primary" onClick={() => go(i + 1)}>Next page →</button>}
      </div>
      <p className="sim-fine ck-note">Page {i + 1} of {pages.length} · ← → turn the page · A fictional hospital and fictional people.</p>
    </section>
  );
}
