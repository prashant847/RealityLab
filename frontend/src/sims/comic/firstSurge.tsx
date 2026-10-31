import type { ReactNode } from "react";
import { Bubble, Clock, Cough, INK, Page, Stick, Sfx, FONT } from "./ink";

/**
 * "The first surge": the opening of the hospital simulation as a comic. Only what the round itself states is shown: the Duty Medical Lead, an emergency
 * department with 31 people waiting (a mix of mild and severe breathing difficulty), patients arriving faster than the team can assess them, guidance that
 * keeps changing, and a team that is anxious and partly new. The last page asks the round's own question, in the round's own words.
 * All people and the hospital are fictional.
 */
export interface ComicPage { id: string; alt: string; spoken: string; render: () => ReactNode }

const Window = ({ x, y, w = 54, h = 64, lit = false }: { x: number; y: number; w?: number; h?: number; lit?: boolean }) => (
  <g><rect x={x} y={y} width={w} height={h} fill={lit ? "#ffe9a3" : "#a9d6ec"} stroke={INK} strokeWidth="4" /><path d={`M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}`} stroke={INK} strokeWidth="3" /><rect x={x} y={y} width={w} height={h} fill="url(#ck-dots-s)" opacity="0.16" /></g>
);
const Chair = ({ x, y }: { x: number; y: number }) => (
  <g><rect x={x} y={y} width="88" height="22" rx="5" fill="#3d7fc4" stroke={INK} strokeWidth="4" /><rect x={x + 4} y={y - 40} width="16" height="42" rx="4" fill="#3d7fc4" stroke={INK} strokeWidth="4" /><path d={`M${x + 12} ${y + 22}V${y + 58}M${x + 76} ${y + 22}V${y + 58}`} stroke={INK} strokeWidth="6" strokeLinecap="round" /></g>
);

// ------------------------------------------------------------------------------------------------- page 1: the morning
function Morning() {
  return (
    <Page tint="#ffd9a8" caption={["Day three, 07:30. Overnight, admissions doubled."]} captionWidth={800}
      bubbles={<Bubble x={150} y={30} w={560} lines={["Thirty-one waiting in the", "emergency department."]} tail={[404, 376]} />}>
      <defs><linearGradient id="ck-sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd0ee" /><stop offset="0.7" stopColor="#ffd3a1" /><stop offset="1" stopColor="#ffb58a" /></linearGradient></defs>
      <rect x="24" y="176" width="1232" height="520" fill="url(#ck-sky1)" />
      <circle cx="236" cy="300" r="58" fill="#ffe36b" stroke={INK} strokeWidth="5" /><circle cx="236" cy="300" r="58" fill="url(#ck-dots-s)" opacity="0.14" />
      {/* the hospital */}
      <rect x="520" y="250" width="640" height="380" fill="#e9d3ab" stroke={INK} strokeWidth="6" /><rect x="520" y="250" width="640" height="380" fill="url(#ck-hatch)" opacity="0.1" />
      <rect x="700" y="206" width="280" height="64" fill="#fff" stroke={INK} strokeWidth="5" /><path d="M840 214v48M816 238h48" stroke="#e53935" strokeWidth="14" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => <Window key={`a${i}`} x={552 + i * 118} y={296} lit={i === 1 || i === 3} />)}
      {[0, 1, 2, 3, 4].map((i) => <Window key={`b${i}`} x={552 + i * 118} y={392} lit={i === 0 || i === 2 || i === 4} />)}
      <rect x="772" y="496" width="136" height="134" fill="#6aa4c8" stroke={INK} strokeWidth="5" /><path d="M840 496V630" stroke={INK} strokeWidth="4" />
      <rect x="738" y="470" width="204" height="34" fill="#fff" stroke={INK} strokeWidth="4.4" /><text x="840" y="496" textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize="22" fill="#d32f2f">EMERGENCY</text>
      {/* pavement and a long queue */}
      <rect x="24" y="620" width="1232" height="76" fill="#b7b2a6" stroke={INK} strokeWidth="5" /><rect x="24" y="620" width="1232" height="76" fill="url(#ck-dots)" opacity="0.12" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <Stick key={i} x={1180 - i * 62} y={648 + (i % 2) * 6} s={0.3} pose="stand" mouth={i % 3 === 0 ? "worried" : "flat"} mask={i % 2 === 0} flip />)}
      {/* an ambulance */}
      <g transform="translate(-30 0)"><rect x="64" y="470" width="230" height="130" rx="14" fill="#fff" stroke={INK} strokeWidth="5.4" /><rect x="64" y="540" width="230" height="22" fill="#e53935" stroke={INK} strokeWidth="4" /><rect x="214" y="486" width="64" height="52" fill="#a9d6ec" stroke={INK} strokeWidth="4" /><path d="M120 506v40M100 526h40" stroke="#e53935" strokeWidth="12" strokeLinecap="round" /><circle cx="116" cy="602" r="24" fill={INK} /><circle cx="116" cy="602" r="9" fill="#ccc" /><circle cx="244" cy="602" r="24" fill={INK} /><circle cx="244" cy="602" r="9" fill="#ccc" /><rect x="150" y="452" width="40" height="22" rx="6" fill="#4fc3f7" stroke={INK} strokeWidth="4" /></g>
      <Stick x={404} y={652} s={1.18} pose="point" mouth="open" outfit="scrubs" hat="scrub-cap" look={4} />
      <rect x="24" y="176" width="1232" height="520" fill="url(#ck-dots)" opacity="0.035" />
    </Page>
  );
}

// ------------------------------------------------------------------------------------------------- page 2: the waiting room
function WaitingRoom() {
  return (
    <Page tint="#bfe3f0" caption={["Patients are arriving faster than your team can assess them."]} captionWidth={940}
      bubbles={<><Bubble x={70} y={30} w={520} lines={["I can hardly catch my breath."]} tail={[176, 284]} /><Bubble x={700} y={30} w={520} lines={["Only a cough, but I have", "been here for hours."]} tail={[920, 284]} /></>}>
      <rect x="24" y="176" width="1232" height="400" fill="#cfe8e4" /><rect x="24" y="176" width="1232" height="400" fill="url(#ck-hatch)" opacity="0.05" />
      <rect x="24" y="560" width="1232" height="136" fill="#e8d6ae" stroke={INK} strokeWidth="5" /><rect x="24" y="560" width="1232" height="136" fill="url(#ck-dots)" opacity="0.1" />
      {/* the sign: how many are waiting */}
      <rect x="430" y="196" width="420" height="104" rx="10" fill={INK} stroke={INK} strokeWidth="6" /><text x="640" y="236" textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize="24" fill="#ffdd57">EMERGENCY · WAITING</text><text x="640" y="288" textAnchor="middle" fontFamily="Impact, 'Arial Black', sans-serif" fontSize="62" fill="#ff5252" letterSpacing="6">31</text>
      <Clock x={1170} y={250} r={44} h={7} m={30} />
      <Window x={90} y={216} w={110} h={120} />
      {/* patients on chairs and standing: some severe, some mild */}
      <Chair x={150} y={520} /><Chair x={560} y={520} /><Chair x={900} y={520} />
      <Stick x={170} y={505} s={0.96} pose="sit" mouth="o" mask sweat tilt={-6} />
      <Cough x={64} y={344} flip />
      <Stick x={575} y={505} s={0.96} pose="sit" mouth="worried" sweat look={-3} />
      <Stick x={915} y={505} s={0.96} pose="sit" mouth="flat" mask />
      <Cough x={1010} y={360} />
      <Stick x={1150} y={600} s={0.85} pose="stand" mouth="grit" flip />
      <Stick x={400} y={610} s={0.85} pose="shrug" mouth="worried" outfit="scrubs" hat="scrub-cap" flip />
      <Sfx x={690} y={470} text="COUGH!" size={74} rotate={-5} />
    </Page>
  );
}

// ------------------------------------------------------------------------------------------------- page 3: the team
function Huddle() {
  return (
    <Page tint="#e6d7f5" caption={["Guidance from health authorities is still changing.", "Your team is anxious and some are new to this."]} captionWidth={800}
      bubbles={<><Bubble x={70} y={30} w={500} lines={["I only started last week."]} tail={[262, 326]} /><Bubble x={680} y={30} w={540} lines={["The guidance changed", "again this morning."]} tail={[1010, 326]} /></>}>
      <rect x="24" y="176" width="1232" height="380" fill="#d9e6ee" /><rect x="24" y="176" width="1232" height="380" fill="url(#ck-hatch)" opacity="0.05" />
      <rect x="24" y="556" width="1232" height="140" fill="#cdbfa0" stroke={INK} strokeWidth="5" /><rect x="24" y="556" width="1232" height="140" fill="url(#ck-dots)" opacity="0.1" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={140 + i * 300} y="186" width="150" height="14" rx="5" fill="#fff8d6" stroke={INK} strokeWidth="4" />)}
      <rect x="500" y="250" width="280" height="190" rx="8" fill="#fff" stroke={INK} strokeWidth="5" /><path d="M524 292h232M524 332h200M524 372h224M524 412h160" stroke="#9aa" strokeWidth="6" strokeLinecap="round" /><text x="640" y="276" textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize="22" fill="#d32f2f">NEW GUIDANCE</text>
      <Stick x={262} y={548} s={1.0} pose="hands-up" mouth="worried" outfit="nurse" hat="nurse-cap" sweat look={4} />
      <Stick x={1010} y={548} s={1.0} pose="hold" mouth="o" outfit="scrubs" hat="scrub-cap" look={-4}
        extra={<g transform="translate(-4 -52)"><rect x="-22" y="-34" width="44" height="64" rx="7" fill={INK} /><rect x="-17" y="-28" width="34" height="46" rx="3" fill="#fff59d" /><path d="M-10 -18h20M-10 -8h14" stroke={INK} strokeWidth="3" /></g>} />
      <Stick x={620} y={600} s={0.85} pose="shrug" mouth="worried" outfit="coat" hat="grey-hair" sweat flip />
      <Sfx x={760} y={500} text="BZZT!" size={84} rotate={6} />
    </Page>
  );
}

// ------------------------------------------------------------------------------------------------- page 4: the question
function TheQuestion() {
  return (
    <Page tint="#ffe08a" caption={["How do you organise who is seen first?"]} captionWidth={720}
      bubbles={<Bubble x={640} y={28} w={600} lines={["Thirty-one in the department.", "Tell me how you want to decide", "who is seen first."]} tail={[1050, 386]} />}>
      <rect x="24" y="176" width="1232" height="400" fill="#c9e1ea" /><rect x="24" y="176" width="1232" height="400" fill="url(#ck-hatch)" opacity="0.06" />
      <rect x="24" y="570" width="1232" height="126" fill="#e8d6ae" stroke={INK} strokeWidth="5" /><rect x="24" y="570" width="1232" height="126" fill="url(#ck-dots)" opacity="0.1" />
      <Clock x={140} y={250} r={48} h={7} m={30} />
      {/* the queue, small and many, behind */}
      {Array.from({ length: 11 }).map((_, i) => <Stick key={i} x={100 + i * 106} y={540 + (i % 2) * 8} s={0.34} pose="stand" mouth={i % 3 === 0 ? "worried" : "flat"} mask={i % 2 === 1} />)}
      <Stick x={330} y={650} s={1.32} pose="clipboard" mouth="worried" outfit="scrubs" hat="scrub-cap" sweat look={4} extra={<g transform="translate(8 -86) rotate(-5)"><rect x="-32" y="-40" width="64" height="80" rx="5" fill="#b9783c" stroke={INK} strokeWidth="4.4" /><rect x="-25" y="-31" width="50" height="62" fill="#fff" stroke={INK} strokeWidth="2.6" /><rect x="-10" y="-46" width="20" height="12" rx="3" fill="#888" stroke={INK} strokeWidth="3" /><path d="M-17 -18h34M-17 -6h34M-17 6h26M-17 18h30" stroke="#8a8f94" strokeWidth="4" strokeLinecap="round" /></g>} />
      <text x="500" y="360" fontFamily={FONT} fontWeight="700" fontSize="130" fill="#ff5252" stroke={INK} strokeWidth="7" paintOrder="stroke" transform="rotate(-8 500 360)">?</text>
      <Stick x={1050} y={640} s={1.15} pose="point" mouth="open" outfit="coat" hat="grey-hair" flip look={-4} />
    </Page>
  );
}

export const FIRST_SURGE: ComicPage[] = [
  { id: "morning", render: () => <Morning />, alt: "Day three, 07:30. The Duty Medical Lead stands outside the hospital: overnight, admissions have doubled, an ambulance is parked and a long queue waits.", spoken: "Day three, 07:30. Overnight, admissions doubled. Thirty-one are waiting in the emergency department." },
  { id: "waiting", render: () => <WaitingRoom />, alt: "The waiting room. A sign shows 31 waiting. One patient can hardly breathe; another says it is only a cough and they have waited hours.", spoken: "Patients are arriving faster than your team can assess them." },
  { id: "huddle", render: () => <Huddle />, alt: "The team huddles in the corridor. A new nurse says she only started last week; a pager buzzes: the guidance changed again this morning.", spoken: "Guidance from health authorities is still changing. Your team is anxious and some are new to this." },
  { id: "question", render: () => <TheQuestion />, alt: "The Duty Medical Lead holds a clipboard, worried, in front of a long queue. The senior consultant asks how you want to decide who is seen first.", spoken: "Thirty-one in the department. Tell me how you want to decide who is seen first. How do you organise who is seen first?" },
];
