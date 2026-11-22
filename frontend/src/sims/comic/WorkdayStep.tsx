import { useEffect, useMemo, useState } from "react";
import type { Outcome, RunView } from "../../api/sims";
import { NarratorStick } from "../../comic/stick/NarratorStick";
import { ChoiceCutscene, prefetchReaction } from "../../comic/stick/ChoiceCutscene";
import type { Reaction } from "../../comic/stick/reaction";
import { spriteUrl, type SpritePose, type SpriteWho } from "../../comic/stick/StickSprite";
import { ReadAloud } from "../../a11y/speak";
import { MeterBar } from "../Meter";
import { WorkdayFrame } from "./workday";
import { WORKDAY, peopleOf, personIn, workdayReaction } from "./workdayData";
import { OPINIONS } from "./workdayAdvice";

/**
 * The BLACKOUT workday, laid out like the crisis: the comic fills the stage (one room, with the camera moving between pages), and the rail beside it holds the
 * decision, the situation, the team and the status. All the words come from the step itself; nothing here decides an outcome.
 */
interface Pg { id: string; speaker: SpriteWho | null; zoom: number; focus: number; cap?: { head?: string; lines: string[] }; say?: { who: SpriteWho; name: string; text: string }; narrate: string }

function pagesFor(step: NonNullable<RunView["scene"]["step"]>): Pg[] {
  const w = WORKDAY[step.id];
  const at = (who: SpriteWho) => w.cast.find((c) => c.who === who)?.x ?? 60;
  const facts = step.facts.slice(0, 2);
  const out: Pg[] = [{ id: "scene", speaker: step.voice ? w.adv : null, zoom: 1, focus: 50, cap: { head: `${step.clock} · ${step.title}`, lines: [step.brief] }, say: step.voice ? { who: w.adv, name: step.voice.name, text: step.voice.line } : undefined, narrate: step.brief }];
  facts.forEach((f, i) => out.push({ id: `fact${i}`, speaker: null, zoom: 1.45, focus: at(i === 0 ? w.adv : w.third), cap: { head: i === 0 ? "What you know" : "Also", lines: [f] }, narrate: f }));
  out.push({ id: "question", speaker: w.adv, zoom: 1.4, focus: at(w.adv), cap: { head: "Your decision", lines: [] }, say: { who: w.adv, name: personIn(step.id, w.adv).name, text: step.question }, narrate: step.question });
  return out;
}

/** The stage: the comic, one page at a time, with Back / Next like the crisis. */
/** Where a speech bubble goes: centred over the speaker as the camera sees them (the camera scales the room around `focus`), with its tail pointing at them. */
function bubbleAt(id: string, p: Pg): { cx: number; tail: number } {
  const x = WORKDAY[id].cast.find((c) => c.who === p.say?.who)?.x ?? 60;
  const seen = p.focus + (x - p.focus) * p.zoom;
  const cx = Math.min(82, Math.max(19, seen));
  return { cx, tail: Math.min(88, Math.max(12, 50 + ((seen - cx) / 32) * 100)) };
}

function Stage({ id, pages, mood }: { id: string; pages: Pg[]; mood?: Partial<Record<SpriteWho, SpritePose>> }) {
  const [i, setI] = useState(0);
  const at = Math.min(i, pages.length - 1);
  const p = pages[at];
  const go = (d: number) => setI((n) => Math.max(0, Math.min(pages.length - 1, n + d)));
  useEffect(() => { setI(0); }, [id]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) return;
      if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  return (
    <section className="comic-page comic-page--art comic-page--paged" aria-label="The comic" data-layout="workday">
      <div className="paged-stage">
        <div className="wd-box" role="group" aria-roledescription="comic page" aria-label={`Page ${at + 1} of ${pages.length}. ${p.narrate}`}>
          {(p.cap || p.say) && (() => {
            // The words live in a strip above the picture, never over it, so they cannot cover anyone. The bubble sits above whoever speaks, the caption beside it.
            const at = p.say ? bubbleAt(id, p) : null;
            const right = at ? at.cx < 50 : false;
            const room = at ? (right ? 100 - at.cx - 16 - 4 : at.cx - 16 - 4) : 100;
            const cap = p.cap && (
              <div key={`c${p.id}`} className={`wd-cap${p.cap.lines.length > 1 ? " wd-cap--facts" : ""}`} style={{ maxWidth: `${Math.min(at ? 54 : 100, Math.max(26, room))}%` }}>
                {p.cap.head && <b>{p.cap.head}</b>}{p.cap.lines.map((l, k) => <span key={k}>{l}</span>)}</div>);
            const say = at && p.say && (
              <div key={`s${p.id}`} className="wd-say" style={{ ["--cx" as string]: `${at.cx}%`, ["--tail" as string]: `${at.tail}%`, ...(right ? { marginLeft: `calc(${at.cx}% - 16%)` } : { marginLeft: "auto", marginRight: `calc(${100 - at.cx}% - 16%)` }) }}><b>{p.say.name}</b><span>{p.say.text}</span></div>);
            return <div className="wd-band">{right ? <>{say}{cap}</> : <>{cap}{say}</>}</div>;
          })()}
          <WorkdayFrame id={id} speaker={p.speaker} moods={mood} zoom={p.zoom} focus={p.focus}>
            <NarratorStick key={`n${p.id}`} text={p.narrate} delay={900} />
          </WorkdayFrame>
        </div>
      </div>
      <nav className="pager" aria-label="Comic panels">
        <button type="button" onClick={() => go(-1)} disabled={at === 0} aria-label="Previous panel">‹ Back</button>
        <span className="pager-dots" role="group" aria-label={`Panel ${at + 1} of ${pages.length}`}>
          {pages.map((q, k) => <button key={q.id} type="button" className={k === at ? "on" : ""} aria-label={`Panel ${k + 1}`} aria-current={k === at ? "true" : undefined} onClick={() => setI(k)} />)}
        </span>
        <button type="button" className={at < pages.length - 1 ? "next" : ""} onClick={() => go(1)} disabled={at === pages.length - 1} aria-label="Next panel">Next ›</button>
      </nav>
    </section>
  );
}

const KIND = ["strong", "mixed", "weak"] as const;
type Kind = (typeof KIND)[number];
const optionNo = (choices: { id: string }[], kind: Kind): number => choices.findIndex((c) => c.id.endsWith(`_${kind}`)) + 1;

/** One person's view: the option they back and the one they argue against, or, if they take no side, just what they think. */
function OpinionLines({ stepId, who, choices }: { stepId: string; who: SpriteWho; choices: { id: string }[] }) {
  const o = OPINIONS[stepId]?.[who];
  if (!o) return null;
  return (
    <>
      {o.for ? <p className="wd-op-for"><i>Backs option {optionNo(choices, o.for)}</i> {o.say}</p> : <p className="wd-op-neutral"><i>Neutral</i> {o.say}</p>}
      {o.against && <p className="wd-op-against"><i>Against option {optionNo(choices, o.against)}</i> {o.why}</p>}
    </>
  );
}

/** Under the options: the views of the people you have asked. Nothing is shown until you ask them in the Team tab. */
function Thoughts({ stepId, choices, asked, onTeam }: { stepId: string; choices: { id: string; label: string }[]; asked: SpriteWho[]; onTeam: () => void }) {
  const people = (Object.keys(peopleOf(stepId)) as SpriteWho[]).filter((who) => asked.includes(who) && OPINIONS[stepId]?.[who]);
  return (
    <section className="wd-thoughts" aria-label="What your team thinks">
      <h3>What your team thinks</h3>
      {people.length === 0 ? (
        <p className="wd-op-empty">You have not asked anyone yet. <button type="button" className="ghost small" onClick={onTeam}>Ask your team</button></p>
      ) : (
        <ul>
          {people.map((who) => {
            const p = personIn(stepId, who);
            return (
              <li key={who}>
                <span className="wd-ava"><img src={spriteUrl(who, "calm", true)} alt="" /></span>
                <div className="wd-op"><p className="wd-op-name"><b>{p.name}</b><small>{p.role}</small></p><OpinionLines stepId={stepId} who={who} choices={choices} /></div>
              </li>);
          })}
        </ul>)}
    </section>
  );
}

/** For each option, how many of the people you have asked back it and how many are against it. */
function tally(stepId: string, asked: SpriteWho[], kind: Kind): { back: number; against: number } {
  const ops = OPINIONS[stepId] ?? {};
  return { back: asked.filter((x) => ops[x]?.for === kind).length, against: asked.filter((x) => ops[x]?.against === kind).length };
}

/** The people in this story. Ask any of them what they think: their view appears here and under the options. Some take a side, some stay neutral; the decision is yours. */
function TeamTab({ stepId, choices, asked, onAsk }: { stepId: string; choices: { id: string; label: string }[]; asked: SpriteWho[]; onAsk: (who: SpriteWho[]) => void }) {
  const everyone = (Object.keys(peopleOf(stepId)) as SpriteWho[]).filter((who) => who !== "director" && OPINIONS[stepId]?.[who]);
  const left = everyone.filter((who) => !asked.includes(who));
  return (
    <div className="wd-teamwrap">
      <p className="wd-teamhint">Ask your team what they think. Their answers also appear under your options. Some take a side, some stay neutral; the decision is yours.</p>
      {left.length > 1 && <button type="button" className="ghost small wd-askall" onClick={() => onAsk(left)}>Ask everyone</button>}
      <ul className="wd-team" aria-label="The people in this story">
        {everyone.map((who) => {
          const p = personIn(stepId, who), open = asked.includes(who);
          return (
            <li key={who} className={open ? "is-open" : ""}>
              <span className="wd-ava"><img src={spriteUrl(who, "calm", true)} alt="" /></span>
              <span className="wd-who"><b>{p.name}</b><small>{p.role}</small></span>
              {!open && <button type="button" className="ghost small" aria-label={`Ask ${p.name} what they think`} onClick={() => onAsk([who])}>Ask</button>}
              {open && <div className="wd-tip wd-op" role="status"><OpinionLines stepId={stepId} who={who} choices={choices} /></div>}
            </li>);
        })}
      </ul>
    </div>
  );
}

type Tab = "decide" | "story" | "team" | "status";
const TABS: [Tab, string][] = [["decide", "Decide"], ["story", "Situation"], ["team", "Team"], ["status", "Status"]];

export function WorkdayStep({ view, picked, busy, onPick, onConfirm }: { view: RunView; picked: string | null; busy: boolean; onPick: (id: string) => void; onConfirm: () => void }) {
  const scene = view.scene;
  const step = scene.step!;
  const w = WORKDAY[step.id];
  const pages = useMemo(() => pagesFor(step), [step]);
  const [tab, setTab] = useState<Tab>("decide");
  const [asked, setAsked] = useState<SpriteWho[]>([]);
  useEffect(() => { setTab("decide"); setAsked([]); }, [step.id, view.run.id]);
  const ask = (who: SpriteWho[]) => setAsked((a) => [...a, ...who.filter((x) => !a.includes(x))]);
  const animate = typeof window !== "undefined" && typeof window.matchMedia === "function";   // (tests have no matchMedia: they submit at once)
  const [cut, setCut] = useState<{ reaction: Reaction; label: string } | null>(null);
  const scripted = (choiceId: string) => {
    const label = step.choices.find((c) => c.id === choiceId)?.label ?? "";
    const r = workdayReaction(step.id, choiceId, label);
    return r ? { ...r, label } : null;
  };
  const pick = (id: string) => { onPick(id); const r = animate ? scripted(id) : null; if (r) prefetchReaction(r.reaction, { adv: w.adv, third: w.third }); };   // the voices load while you read your choice
  const confirm = () => {
    if (cut || !picked) return;
    const r = animate ? scripted(picked) : null;
    if (!r) { onConfirm(); return; }
    setCut({ reaction: r.reaction, label: r.label });
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) return;
      const i = "12345678".indexOf(e.key);
      if (e.key.length === 1 && i >= 0 && step.choices[i]?.available && !busy && !cut) { setTab("decide"); pick(step.choices[i].id); }
      else if (e.key === "Enter" && picked && !busy && !cut && !(t && (t.tagName === "BUTTON" || t.tagName === "A"))) { e.preventDefault(); confirm(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
  const events = scene.events ?? [];
  return (
    <div className="bo-scene wd-scene">
      <main className="bo-stage">
        <div className="bo-title"><p className="kicker">{step.clock} · Step {scene.round} of {scene.total_rounds}{events.length > 0 ? " · new developments" : ""}</p><h1>{step.title}</h1></div>
        <Stage id={step.id} pages={pages} />
      </main>
      <aside className="bo-rail" aria-label="Decision, situation, team and status">
        <div className="bo-tabs" role="tablist" aria-label="Panels">
          {TABS.map(([k, label]) => <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
        </div>
        <div className="bo-tabpanel" role="tabpanel">
          {tab === "decide" && (<>
            <p className="bo-job"><b>Your job:</b> {step.question}</p>
            <div className="decisions">
              <div role="radiogroup" aria-label="Available decisions" className="decision-list">
                {step.choices.map((c, i) => (
                  <button key={c.id} type="button" role="radio" aria-checked={picked === c.id} aria-disabled={!c.available} className={`decision${picked === c.id ? " is-selected" : ""}${c.available ? "" : " is-disabled"}`} disabled={busy || !!cut}
                    onClick={() => c.available && pick(c.id)}>
                    <span className="decision-key" aria-hidden="true">{i + 1}</span>
                    <span className="decision-body"><strong>{c.label}</strong><span className="decision-summary">{c.summary}</span>{(() => { const k = KIND.find((x) => c.id.endsWith(`_${x}`)); const t = k ? tally(step.id, asked, k) : null; return t && (t.back || t.against) ? <span className="decision-votes">{t.back > 0 && <i className="for">{t.back} back</i>}{t.against > 0 && <i className="against">{t.against} against</i>}</span> : null; })()}{!c.available && <span className="decision-why">{c.reason}</span>}</span>
                  </button>))}
              </div>
              <button type="button" className="commit" disabled={!picked || busy || !!cut} onClick={confirm}>{busy ? "Applying…" : picked ? "Commit decision" : "Select an option"}</button>
            </div>
            <Thoughts stepId={step.id} choices={step.choices} asked={asked} onTeam={() => setTab("team")} />
          </>)}
          {tab === "story" && (<>
            <p className="lede-sm">{step.brief}</p>
            <ul className="scene-info">{step.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
            {scene.round === 1 && (scene.prepared?.length ?? 0) > 0 && <div className="sim-prep" role="note"><b>From your normal day:</b><ul>{scene.prepared!.map((q) => <li key={q.flag}>{q.label}{q.full ? "" : " (half)"}</li>)}</ul></div>}
            {events.map((e) => <div key={e.event_id} className="sim-event" role="status"><b>Development: {e.title}</b><p>{e.text}</p></div>)}
            <ReadAloud text={() => [step.brief, ...step.facts].join(". ")} />
          </>)}
          {tab === "team" && <TeamTab stepId={step.id} choices={step.choices} asked={asked} onAsk={ask} />}
          {tab === "status" && <section className="sim-meters sm-grid" aria-label="Indicators">{scene.meters.map((m) => <MeterBar key={m.id} m={m} />)}</section>}
        </div>
      </aside>
      {cut && (
        <div className="wd-cutwrap" role="presentation"><div className="wd-cutbox">
          <ChoiceCutscene env="ops_office" bg={w.bg} fl={w.fl} fs={w.fs} spots={w.spots} label={cut.label} reaction={cut.reaction} who={{ adv: w.adv, third: w.third }}
            names={{ lead: peopleOf(step.id).director?.name ?? "You", adv: personIn(step.id, w.adv).name, third: personIn(step.id, w.third).name }} onDone={() => { setCut(null); onConfirm(); }} />
        </div></div>)}
    </div>
  );
}

/** After the decision: the same layout. The room shows how the people took it, the rail says what happened and what changed. */
export function WorkdayOutcome({ outcome, prev, view, onNext, tech }: { outcome: Outcome; prev: RunView; view: RunView; onNext: () => void; /** A generated technical simulation: one option works and a wrong one ends the job. */ tech?: { onRetry: () => void } }) {
  const step = prev.scene.step!;
  const w = WORKDAY[step.id];
  const labels = Object.fromEntries(view.scene.meters.map((m) => [m.id, m]));
  const mood: SpritePose = outcome.rating === "strong" ? "determined" : outcome.rating === "mixed" ? "calm" : "worried";
  const moods: Partial<Record<SpriteWho, SpritePose>> = Object.fromEntries(w.cast.filter((c) => c.who !== "director").map((c) => [c.who, mood]));
  const pages: Pg[] = useMemo(() => [
    { id: "result", speaker: w.adv, zoom: 1.1, focus: w.cast.find((c) => c.who === w.adv)?.x ?? 60, cap: { head: "What happened", lines: [outcome.consequence] }, narrate: outcome.consequence },
    ...(outcome.lesson ? [{ id: "lesson", speaker: null, zoom: 1.4, focus: 40, cap: { head: "The lesson", lines: [outcome.lesson] }, narrate: outcome.lesson } as Pg] : []),
  ], [outcome, w]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (e.key === "Enter" && !(t && (t.tagName === "BUTTON" || t.tagName === "A" || t.tagName === "INPUT"))) { e.preventDefault(); onNext(); } };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onNext]);
  const failed = !!tech && outcome.rating !== "strong";
  const right = failed ? step.choices.find((c) => c.id.endsWith("_strong")) : undefined;
  const rating = tech ? (failed ? "Technical failure" : "Correct step") : { strong: "Strong decision", mixed: "Mixed decision", weak: "Weak decision" }[outcome.rating];
  return (
    <div className="bo-scene wd-scene">
      <main className="bo-stage">
        <div className="bo-title"><p className="kicker">{step.clock} · Result</p><h1>What happened next</h1></div>
        <Stage id={step.id} pages={pages} mood={moods} />
      </main>
      <aside className="bo-rail" aria-label="Result">
        <div className="bo-tabpanel" role="region">
          <p className={`wd-rate wd-rate--${tech ? (failed ? "weak" : "strong") : outcome.rating}`}>{rating}</p>
          <p className="bo-job"><b>You chose:</b> {outcome.label}</p>
          <p className="lede-sm">{outcome.consequence}</p>
          {right && <p className="lab-right"><b>What would have worked:</b> {right.label}</p>}
          {Object.keys(outcome.changes).length > 0 && (
            <ul className="wd-changes" aria-label="What changed">
              {Object.entries(outcome.changes).map(([k, [a, b]]) => {
                const better = labels[k]?.good === "low" ? b < a : b > a;
                return <li key={k} className={better ? "up" : "down"}>{better ? "▲" : "▼"} {labels[k]?.label ?? k}: {a} → {b}</li>;
              })}
            </ul>)}
          {outcome.lesson && <p className="wd-lesson"><b>Lesson:</b> {outcome.lesson}</p>}
          <ReadAloud text={() => `${outcome.consequence} ${outcome.lesson ? `Lesson: ${outcome.lesson}` : ""}`} />
          <button type="button" className="commit" onClick={onNext}>{outcome.completed ? (tech ? (failed ? "See what went wrong" : "See your report") : "See your career experience report") : "Continue"}</button>
          {failed && <button type="button" className="ghost lab-retry" onClick={tech!.onRetry}>Try again from step 1</button>}
        </div>
      </aside>
    </div>
  );
}
