import { CHOICE_PLAIN, GLOSSARY, plainRound } from "../story/plain";

/** The round in three short lines: where we are, what is wrong, and what the player has to decide; plus what they have done so far. */
export function PlainBrief({ round, trail, original }: { round: number | undefined; trail: string[]; original?: string }) {
  const p = plainRound(round);
  if (!p) return original ? <p className="lede-sm">{original}</p> : null;
  const done = trail.map((id) => CHOICE_PLAIN[id]?.done).filter((x): x is string => Boolean(x));
  return (
    <section className="plain-brief" aria-label="What is going on">
      <dl>
        <div><dt>Where we are</dt><dd>{p.where}</dd></div>
        <div><dt>The problem</dt><dd>{p.problem}</dd></div>
        <div className="plain-brief-job"><dt>Your job now</dt><dd>{p.job}</dd></div>
      </dl>
      {done.length > 0 && (
        <details className="plain-sofar">
          <summary>The story so far ({done.length} decision{done.length === 1 ? "" : "s"})</summary>
          <ol>{done.map((d, i) => <li key={i}>You {d}.</li>)}</ol>
        </details>
      )}
      {original && <details className="plain-original"><summary>Read the original briefing</summary><p>{original}</p></details>}
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
