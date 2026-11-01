import type { ReactNode } from "react";

// Object close-ups for the NotPetya story: comic-book illustrations (public/assets/scene/shot/<name>.webp), one per kind of shot.
// An id is "name" or "name:variant"; the variant says which decision or event the picture shows and is kept on the element as data-variant.
export type ShotId = string;
export const SHOT_IDS = ["monitors_failing", "ransom_screen", "crane_idle", "paper_list", "gate_queue", "route_map", "survivor_map", "two_numbers", "whiteboard", "update_diagram", "wiped_disk", "priority_choice", "news_tv", "gate_open"];

const ALT: Record<string, string> = {
  monitors_failing: "A wall of monitors, most of them dead, some showing red warnings", ransom_screen: "A screen locked by a red ransom warning",
  crane_idle: "A harbour crane standing idle over a docked ship", paper_list: "A handwritten checklist on a clipboard", gate_queue: "A closed terminal gate and a long queue of trucks",
  route_map: "A map of the site with coloured routes", survivor_map: "A network diagram where only a few systems are still alive", two_numbers: "Two charts side by side, one high and one low",
  whiteboard: "A whiteboard full of boxes, arrows and sticky notes", update_diagram: "A diagram of a software update spreading between computers", wiped_disk: "A blank laptop beside a cracked hard drive",
  priority_choice: "A fork in the road between two stacks of crates", news_tv: "A television showing a news report", gate_open: "The terminal gate opening at sunrise",
};

export function Shot({ id }: { id: ShotId }): ReactNode {
  const [name, variant] = id.split(":");
  if (!SHOT_IDS.includes(name)) return null;
  return (
    <div className="np-backdrop np-backdrop--shot" data-backdrop={`shot:${name}`} data-variant={variant} role="img" aria-label={ALT[name]}>
      <img src={`${import.meta.env.BASE_URL}assets/scene/shot/${name}.webp`} alt="" draggable={false} decoding="async" />
    </div>
  );
}
