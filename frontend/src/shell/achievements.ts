import type { Career, CareerChoice, LibraryItem } from "../api/sims";

export interface Badge { id: string; title: string; hint: string; earned: boolean }
const crisisRoute = (id: string) => (id === "blackout" ? "#/play/blackout" : `#/crisis/${id}`);

/** Milestones, worked out from progress the app already keeps: nothing extra is stored. */
export function achievements(careers: Career[], library: LibraryItem[], choice: CareerChoice | null): Badge[] {
  const done = careers.filter((c) => c.you.complete);
  const phases = careers.flatMap((c) => [c.you.phases.workday, c.you.phases.crisis]).filter((p): p is NonNullable<typeof p> => Boolean(p));
  return [
    { id: "first_day", title: "First day on the job", hint: "Finish a normal day.", earned: careers.some((c) => c.you.phases.workday) },
    { id: "both_sides", title: "Both sides of the job", hint: "Finish a normal day and the crisis of the same job.", earned: done.length >= 1 },
    { id: "explorer", title: "Explorer", hint: "Try all three professions.", earned: careers.every((c) => c.you.phases.workday || c.you.phases.crisis) },
    { id: "planner", title: "Planner", hint: "Set up 5 or more things in a normal day.", earned: library.some((l) => (l.workday?.prep_earned ?? 0) >= 5) },
    { id: "steady", title: "Steady hands", hint: "Reach 70% decision quality in a crisis.", earned: careers.some((c) => (c.you.phases.crisis?.quality ?? 0) >= 70) },
    { id: "reflective", title: "Reflective", hint: "Rate how three runs felt.", earned: phases.filter((p) => p.reflection).length >= 3 },
    { id: "comparer", title: "Comparer", hint: "Finish both parts of two jobs.", earned: done.length >= 2 },
    { id: "decider", title: "Decider", hint: "Record the career you would opt for.", earned: Boolean(choice) },
  ];
}

/** The most useful next step for this student, or null when everything has been played. */
export function upNext(library: LibraryItem[], careers: Career[], choice: CareerChoice | null): { label: string; text: string; to: string } | null {
  const active = library.find((l) => l.status === "active");
  if (active) return { label: "Continue the crisis", text: `Pick up ${active.title} where you left off.`, to: crisisRoute(active.id) };
  const dayActive = library.find((l) => l.workday?.status === "active");
  if (dayActive) return { label: "Continue the day", text: `Finish your normal day for ${dayActive.title}.`, to: `#/workday/${dayActive.id}` };
  const next = library.find((l) => l.workday?.status === "completed" && l.status === "none");
  if (next) return { label: "Begin the crisis", text: `Your normal day for ${next.title} is done. See what it set up.`, to: crisisRoute(next.id) };
  const fresh = library.find((l) => (l.workday?.status ?? "none") === "none" && l.status === "none");
  if (fresh) return { label: "Start with a normal day", text: `Try ${fresh.title}. Start with an ordinary day on the job.`, to: `#/workday/${fresh.id}` };
  if (careers.filter((c) => c.you.complete).length >= 2 && !choice) return { label: "Compare how you did", text: "You have finished two jobs. See how you did and felt in each.", to: "#/compare" };
  return null;
}
