import { CHARACTER_IDS, type CharacterId } from "../comic/types";
import { characterInfo } from "../comic/assets";
import { SPRITE_POSES, StickSprite, type SpriteWho } from "../comic/stick/StickSprite";

const WHO: Record<CharacterId, SpriteWho> = { player: "director", arjun: "arjun", kavya: "kavya", nisha: "nisha", raghav: "raghav", isha: "isha" };

/** Reference sheets: every drawn character in all eight expressions and poses, full body and head-and-shoulders (consistency check). */
export function CharacterSheets() {
  return (
    <section aria-labelledby="g-sheets">
      <h2 id="g-sheets">Character reference sheets</h2>
      {CHARACTER_IDS.map((id) => (
        <div key={id} className="sheet">
          <h3>{characterInfo(id).name} <span className="muted">{characterInfo(id).role}</span></h3>
          <div className="sheet-row">
            {SPRITE_POSES.map((p) => (
              <figure key={p} className="sheet-cell"><div className="sheet-face"><StickSprite who={WHO[id]} pose={p} bust still /></div><figcaption>{p}</figcaption></figure>
            ))}
          </div>
          <div className="sheet-row">
            {SPRITE_POSES.map((p) => (
              <figure key={p} className="sheet-cell"><div className="sheet-body"><StickSprite who={WHO[id]} pose={p} still /></div><figcaption>{p}</figcaption></figure>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
