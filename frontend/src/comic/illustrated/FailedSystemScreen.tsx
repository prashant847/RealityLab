/** A failed inventory terminal built from HTML and CSS only (no SVG, no image). Laid out in a 1000x640 box and then
 *  mapped onto the laptop screen in the photograph. Words come from the scene's own known facts (for example
 *  "Inventory dashboard offline; barcode scanners are not responding."); with no facts it shows no words at all. */
export const SCREEN_W = 1000;
export const SCREEN_H = 640;

/** Splits the first known fact into its clauses ("Inventory dashboard offline", "barcode scanners are not responding"). */
export function screenLines(facts: string[]): string[] {
  const first = facts[0] ?? "";
  return first.split(/[;.]/).map((s) => s.trim()).filter(Boolean).slice(0, 2);
}

export function FailedSystemScreen({ facts }: { facts: string[] }) {
  const [primary, secondary] = screenLines(facts);
  return (
    <div className="fs" style={{ width: SCREEN_W, height: SCREEN_H }} aria-hidden="true">
      <div className="fs-bar"><i /><i /><i />{primary && <span>{primary}</span>}</div>
      <div className="fs-body">
        <div className="fs-warn"><b /></div>
        <div className="fs-rows">
          {Array.from({ length: 7 }, (_, i) => <div key={i} className={`fs-row${i === 2 ? " is-bad" : ""}`}><u /><u /><u /></div>)}
        </div>
      </div>
      {secondary && <div className="fs-foot"><em />{secondary}</div>}
      <div className="fs-scan" />
    </div>
  );
}
