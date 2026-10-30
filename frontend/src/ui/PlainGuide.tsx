import { CHOICE_PLAIN, GLOSSARY, plainRound } from "../story/plain";

/** The round in two short lines (what is wrong, what you must decide); everything else about it is one click away. */
export function PlainBrief({ round, trail, original }: { round: number | undefined; trail: string[]; original?: string }) {
  const p = plainRound(round);
  if (!p) return original ? <p className="lede-sm">{original}</p> : null;
  const done = trail.map((id) => CHOICE_PLAIN[id]?.done).filter((x): x is string => Boolean(x));
  return (
    <section className="plain-brief" aria-label="What is going on">
      <p className="plain-label" data-evidence={p.label}>{p.label === "documented" ? "Documented history" : p.label === "reconstructed" ? "Reconstructed scene" : "Simulation"}</p>
      <p className="plain-problem">{p.problem}</p>
      <p className="plain-job"><b>Your job:</b> {p.job.replace(/^Decide /, "decide ")}</p>
      <details className="plain-more">
        <summary>More about this round</summary>
        <dl>
          <div><dt>Where we are</dt><dd>{p.where}</dd></div>
          {p.record && <div><dt>What the record says</dt><dd>{p.record}</dd></div>}
          {done.length > 0 && <div><dt>Your decisions so far ({done.length})</dt><dd><ol>{done.map((d, i) => <li key={i}>You {d}.</li>)}</ol></dd></div>}
          {original && <div><dt>Original briefing</dt><dd>{original}</dd></div>}
        </dl>
      </details>
    </section>
  );
}

/** Explains the hard words that appear in this round's text. */
export function Glossary({ texts }: { texts: string[] }) {
  const all = texts.join(" \n ");
  const used = GLOSSARY.filter((g) => g.match.test(all));
  if (used.length === 0) return null;
  return (
    <details className="glossary">
      <summary>Words explained ({used.length})</summary>
      <dl>{used.map((g) => <div key={g.term}><dt>{g.term}</dt><dd>{g.means}</dd></div>)}</dl>
    </details>
  );
}

/** What the player knows, and the hard words, in one fold under the comic. */
export function Facts({ info, texts }: { info: string[]; texts: string[] }) {
  const all = texts.join(" \n ");
  const used = GLOSSARY.filter((x) => x.match.test(all));
  return (
    <details className="card known facts" aria-labelledby="known-h">
      <summary id="known-h">What you know{used.length > 0 ? ` and ${used.length} word${used.length === 1 ? "" : "s"} explained` : ""}</summary>
      <ul className="scene-info">{info.map((t, i) => <li key={i}>{t}</li>)}</ul>
      {used.length > 0 && <dl className="glossary-list">{used.map((x) => <div key={x.term}><dt>{x.term}</dt><dd>{x.means}</dd></div>)}</dl>}
    </details>
  );
}
