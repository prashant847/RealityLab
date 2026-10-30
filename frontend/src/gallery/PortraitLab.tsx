import { FlatPerson, type Expr, type Pose, type Who } from "../comic/flat/Person";

const CAST: [Who, Expr, Pose][] = [["arjun", "concerned", "at_desk"], ["arjun", "shocked", "idle"], ["director", "concerned", "hand_chin"], ["director", "determined", "arms_crossed"], ["kavya", "determined", "point"], ["nisha", "focused", "clipboard"], ["raghav", "neutral", "idle"], ["isha", "concerned", "arms_crossed"], ["worker", "neutral", "idle"]];

/** Preview bench: the flat cast. */
export function PortraitLab() {
  return (
    <section aria-labelledby="g-portraits">
      <h2 id="g-portraits">Flat cast (reference style)</h2>
      <div className="lab-row lab-row--plain" data-lab="cast">
        {CAST.map(([w, e, p], i) => <figure key={i} className="lab-cell" style={{ width: 170 }}><div className="lab-art lab-art--plain" style={{ aspectRatio: "2 / 5" }}><FlatPerson who={w} expression={e} pose={p} /></div><figcaption>{w} · {e} · {p}</figcaption></figure>)}
      </div>
    </section>
  );
}
