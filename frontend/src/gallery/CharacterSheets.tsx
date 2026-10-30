import { Figure } from "../comic/art/Figure";
import { FACES, faceFor, type Emotion } from "../comic/art/emotion";
import type { PoseId } from "../comic/art/poses";
import { CHARACTER_IDS } from "../comic/types";
import { characterInfo } from "../comic/assets";

const EMOTIONS = Object.keys(FACES) as Emotion[];
const POSES: PoseId[] = ["idle", "crossed", "point", "hold_paper", "hold_tablet", "lean_terminal", "stop_palm", "open_palm", "hand_chin", "hand_neck", "radio", "hands_desk", "hips", "hover_pen"];

/** Reference sheets: every character in every emotion (consistency check) and in every pose. */
export function CharacterSheets() {
  return (
    <section aria-labelledby="g-sheets">
      <h2 id="g-sheets">Character reference sheets</h2>
      {CHARACTER_IDS.map((id) => (
        <div key={id} className="sheet">
          <h3>{characterInfo(id).name} <span className="muted">{characterInfo(id).role}</span></h3>
          <div className="sheet-row">
            {EMOTIONS.map((e) => (
              <figure key={e} className="sheet-cell"><div className="sheet-face"><Figure id={id} face={faceFor(e, `sheet${id}${e}`)} facing="front" /></div><figcaption>{e.replace(/_/g, " ")}</figcaption></figure>
            ))}
          </div>
        </div>
      ))}
      <h3>Costumes (full length)</h3>
      <div className="sheet-row">
        {CHARACTER_IDS.map((id) => (
          <figure key={id} className="sheet-cell sheet-cell--full"><div className="sheet-full"><Figure id={id} face={faceFor("composure", `full${id}`)} pose="idle" facing="right" full /></div><figcaption>{characterInfo(id).name}</figcaption></figure>
        ))}
      </div>
      <h3>Poses</h3>
      <div className="sheet-row">
        {POSES.map((p) => (
          <figure key={p} className="sheet-cell sheet-cell--pose"><div className="sheet-body"><Figure id="arjun" face={faceFor("composure", p)} pose={p} facing="right" /></div><figcaption>{p.replace(/_/g, " ")}</figcaption></figure>
        ))}
      </div>
    </section>
  );
}
