import type { ReactNode } from "react";
import type { ComicPage } from "./types";
import { NarratorStick } from "../../comic/stick/NarratorStick";

/**
 * COVID Hospital, Round 1 ("The first surge") told as a comic: three pages of panels, each page a printed sheet with gutters. Every panel is a
 * hand-inked comic illustration (public/assets/scene/covid/<panel>.webp, generated in the style of the Henry Stickmin cartoons) and every word is
 * live comic lettering on top of it. Only what the round states is shown: 31 people waiting, a mix of mild and severe breathing difficulty, patients
 * arriving faster than the team can assess them, changing guidance, an anxious and partly new team, and a senior consultant's question.
 * All people and the hospital are fictional.
 */
type Tail = "l" | "c" | "r";
interface Bubble { text: string; x: number; y: number; w: number; tail?: Tail; who?: string }
interface Sfx { text: string; x: number; y: number; rot?: number; color?: string }
interface PanelSpec { id: string; area: string; focus?: string; bubbles?: Bubble[]; caption?: { text: string[]; x?: number; y?: number; w?: number }; sfx?: Sfx; board?: boolean }

const img = (id: string) => `${import.meta.env.BASE_URL}assets/scene/covid/${id}.webp`;

function Panel({ p, i }: { p: PanelSpec; i: number }) {
  return (
    <figure className="cm-panel" style={{ gridArea: p.area, ["--i" as string]: i }} data-panel={p.id}>
      <img src={img(p.id)} alt="" draggable={false} style={{ objectPosition: p.focus ?? "50% 50%" }} />
      {p.board && <div className="cm-board" aria-hidden="true"><b>31</b><span>WAITING</span></div>}
      {p.sfx && <div className="cm-sfx" style={{ left: `${p.sfx.x}%`, top: `${p.sfx.y}%`, ["--rot" as string]: `${p.sfx.rot ?? -6}deg`, color: p.sfx.color }}><span>{p.sfx.text}</span></div>}
      {p.bubbles?.map((b, k) => (
        <div key={k} className={`cm-bubble cm-bubble--${b.tail ?? "c"}`} style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, ["--k" as string]: k }}>
          {b.who && <b>{b.who}</b>}<span>{b.text}</span>
        </div>
      ))}
      {p.caption && (
        <div className="cm-caption" style={{ left: `${p.caption.x ?? 3}%`, top: p.caption.y === undefined ? undefined : `${p.caption.y}%`, bottom: p.caption.y === undefined ? "4%" : undefined, width: `${p.caption.w ?? 60}%` }}>
          {p.caption.text.map((t, k) => <span key={k}>{t}</span>)}
        </div>
      )}
    </figure>
  );
}

function Sheet({ layout, panels, label, narration }: { layout: string; panels: PanelSpec[]; label: string; narration?: string }): ReactNode {
  return <section className={`cm-sheet cm-sheet--${layout}`} aria-label={label}>{panels.map((p, i) => <Panel key={p.id} p={p} i={i} />)}{narration && <NarratorStick text={narration} delay={1200} />}</section>;
}

const PAGE1: PanelSpec[] = [
  { id: "a1", area: "a", focus: "50% 62%", caption: { text: ["Day three, 07:30.", "Overnight, admissions doubled."], x: 3, y: 6, w: 38 }, sfx: { text: "WEE-OO!", x: 4, y: 52, rot: -8, color: "#ff4a2a" } },
  { id: "b1", area: "b" },
  { id: "c1", area: "c", board: true, bubbles: [{ text: "Thirty-one people are waiting in the emergency department.", x: 38, y: 6, w: 58, tail: "l" }] },
];
const PAGE2: PanelSpec[] = [
  { id: "a2", area: "a", bubbles: [{ text: "A mix of mild and severe breathing difficulty.", x: 4, y: 6, w: 52, tail: "r" }] },
  { id: "b2", area: "b", sfx: { text: "COUGH!", x: 52, y: 8, rot: 6, color: "#ff4a2a" } },
  { id: "c2", area: "c", bubbles: [{ text: "Patients are arriving faster than your team can assess them.", x: 30, y: 5, w: 66, tail: "r" }] },
  { id: "d2", area: "d" },
];
const PAGE3: PanelSpec[] = [
  { id: "a3", area: "a", bubbles: [{ text: "Guidance from health authorities is still changing.", x: 4, y: 5, w: 50, tail: "c" }], sfx: { text: "BZZT!", x: 56, y: 60, rot: -10, color: "#ffcf3a" } },
  { id: "b3", area: "b", bubbles: [{ text: "Your team is anxious and some are new to this.", x: 38, y: 6, w: 58, tail: "l" }] },
  { id: "c3", area: "c" },
  { id: "d3", area: "d", bubbles: [{ who: "Dr. Farid Hakim", text: "Thirty-one in the department. Tell me how you want to decide who is seen first.", x: 4, y: 4, w: 92, tail: "c" }], caption: { text: ["How do you organise who is seen first?"], x: 4, w: 92 } },
];

export const ROUND1_STORY: ComicPage[] = [
  { id: "page1", render: () => <Sheet layout="one" panels={PAGE1} label="Page one" narration="Day three, 07:30. Overnight, admissions doubled. Thirty-one people are waiting in the emergency department." />, alt: "Page one. Day three, 07:30: overnight, admissions doubled. Ambulances arrive at the hospital and a long queue waits outside; a stretcher is pulled from an ambulance; a sign over the emergency doors shows 31 waiting.", spoken: "Day three, 07:30. Overnight, admissions doubled. Thirty-one people are waiting in the emergency department." },
  { id: "page2", render: () => <Sheet layout="grid" panels={PAGE2} label="Page two" narration="A mix of mild and severe breathing difficulty. Patients are arriving faster than your team can assess them." />, alt: "Page two. The waiting room seen from above, full of patients, some calm and some struggling to breathe; a calm patient beside a gasping one; a single nurse at a desk with a queue stretching far longer than she can assess; more people keep coming through the doors.", spoken: "A mix of mild and severe breathing difficulty. Patients are arriving faster than your team can assess them." },
  { id: "page3", render: () => <Sheet layout="grid" panels={PAGE3} label="Page three" narration="Guidance from health authorities is still changing. Your team is anxious, and some are new to this. And now the senior consultant wants to know how you will decide who is seen first." />, alt: "Page three. Staff at the nurses' station watch a new sheet of guidance replace the old one as a pager buzzes; a newly qualified nurse sweats, clutching her clipboard; the Duty Medical Lead stands small in the middle of the hall with a question mark overhead; the senior consultant, Dr. Farid Hakim, asks how you want to decide who is seen first.", spoken: "Guidance from health authorities is still changing. Your team is anxious and some are new to this. Dr. Farid Hakim: Thirty-one in the department. Tell me how you want to decide who is seen first. How do you organise who is seen first?" },
];
