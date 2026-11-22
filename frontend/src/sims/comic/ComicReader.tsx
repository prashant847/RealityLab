import { useEffect, useState } from "react";
import type { ComicPage } from "./types";
import { speak, stopSpeaking, canSpeak } from "../../a11y/speak";
import { useA11y } from "../../a11y/a11y";
import "./comic.css";

/** Reads a comic one page at a time. ← → turn the page, Enter on the last page continues, and Skip is always there. Each page has a text description for screen readers. */
export function ComicReader({ pages, title, onDone }: { pages: ComicPage[]; title: string; onDone: () => void }) {
  const [i, setI] = useState(0);
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
        {page.render()}
      </div>
      <div className="ck-bar">
        <button type="button" className="sim-btn" onClick={() => go(i - 1)} disabled={i === 0}>← Back</button>
        <ol className="ck-dots" aria-label="Comic pages">{pages.map((p, k) => <li key={p.id}><button type="button" className={k === i ? "on" : k < i ? "done" : ""} aria-label={`Page ${k + 1}`} aria-current={k === i ? "page" : undefined} onClick={() => go(k)} /></li>)}</ol>
        {a.readAloud && canSpeak() && <button type="button" className="sim-btn" onClick={() => speak(page.spoken)}>Read this page aloud</button>}
        <span className="sim-spacer" />
        <button type="button" className="sim-btn sim-btn--ghost" onClick={onDone}>Skip the comic</button>
        {last ? <button type="button" className="sim-btn sim-btn--primary" onClick={onDone}>Make your decision →</button> : <button type="button" className="sim-btn sim-btn--primary" onClick={() => go(i + 1)}>Next page →</button>}
      </div>
      <p className="sim-fine ck-note">Page {i + 1} of {pages.length} · ← → turn the page · Fictional people and places.</p>
    </section>
  );
}
