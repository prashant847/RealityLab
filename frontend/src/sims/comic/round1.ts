import type { PanelSpec } from "./graphic";

/**
 * COVID Hospital, Round 1 ("The first surge"): the illustrated opening. The words are the round's own (its clock, brief, facts, question and its
 * senior consultant's line); nothing is added. The pictures are static files in public/comic/round1/ made offline with ComfyUI; the game never needs ComfyUI.
 * All people and the hospital are fictional.
 */
const src = (n: number) => `/comic/round1/p${n}.jpg`;

export const ROUND1_PANELS: PanelSpec[] = [
  {
    id: "p1", src: src(1),
    alt: "Early morning outside the district hospital. Ambulances are parked at the emergency entrance and a long queue of people waits in the cold light. The Duty Medical Lead stands at the doors, looking at the line.",
    spoken: "Day three, 07:30. Overnight, admissions doubled.",
    narration: [{ lines: ["Day three, 07:30.", "Overnight, admissions doubled."], x: 40, y: 36, w: 470 }],
  },
  {
    id: "p2", src: src(2),
    alt: "The emergency department waiting room is full. Some patients sit calmly; others struggle to breathe. The Duty Medical Lead watches from the edge of the room.",
    spoken: "Thirty-one people are waiting in the emergency department, with a mix of mild and severe breathing difficulty.",
    narration: [{ lines: ["Thirty-one people are waiting in the", "emergency department. A mix of mild and", "severe breathing difficulty."], x: 40, y: 560, w: 700 }],
  },
  {
    id: "p3", src: src(3),
    alt: "In a staff room, a small team gathers: a newly qualified nurse looks uncertain, and colleagues read the latest instructions from the health authority.",
    spoken: "Guidance from health authorities is still changing. Your team is anxious and some are new to this.",
    narration: [{ lines: ["Guidance from health authorities is still", "changing. Your team is anxious and some", "are new to this."], x: 40, y: 540, w: 640 }],
  },
  {
    id: "p4", src: src(4),
    alt: "Close on the Duty Medical Lead in the corridor, serious and tired, as staff and patients move behind.",
    spoken: "Patients are arriving faster than your team can assess them.",
    narration: [{ lines: ["Patients are arriving faster than your", "team can assess them."], x: 40, y: 580, w: 560 }],
  },
  {
    id: "p5", src: src(5),
    alt: "The senior consultant, Dr. Farid Hakim, faces the Duty Medical Lead in the hospital corridor and asks how they want to decide who is seen first.",
    spoken: "Dr. Farid Hakim: Thirty-one in the department. Tell me how you want to decide who is seen first. How do you organise who is seen first?",
    speech: [{ lines: ["Thirty-one in the department.", "Tell me how you want to decide", "who is seen first."], x: 30, y: 34, w: 560, tail: [500, 310] }],
    narration: [{ lines: ["How do you organise who is seen first?"], x: 40, y: 636, w: 640 }],
  },
];
