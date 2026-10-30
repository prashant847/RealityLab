import { ARJUN, Character, DIRECTOR, EXPRESSIONS } from "../comic/infographic/Characters";

/** Export bench (#/char-export): every character at every expression on a transparent page. A script screenshots each tile to a transparent PNG. */
export function CharacterExport() {
  return (
    <div className="char-export" style={{ background: "transparent" }}>
      {[ARJUN, DIRECTOR].flatMap((spec) => EXPRESSIONS.map((ex) => (
        <div key={`${spec.who}-${ex}`} className="char-tile" data-name={`${spec.who}_${ex}`} style={{ width: 800, height: 1000, margin: 0 }}>
          <Character spec={spec} expression={ex} />
        </div>
      )))}
    </div>
  );
}
