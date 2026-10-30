import type { ReactNode } from "react";
import { Figure, FigureG, MOODS, ROLE_TITLES, type Mood, type Pose, type Role } from "./Cast";
import { OfficeDark, RansomScreen, TerminalGate } from "./Rooms";

// STAGE 3 PREVIEW page (#/preview-notpetya). Shows the proposed art direction; nothing here is wired into the game.
const ROLES = Object.keys(ROLE_TITLES) as Role[];
const POSES: Pose[] = ["idle", "point", "clipboard", "hand_chin", "arms_crossed", "phone"];

const Panel = ({ w, h, children, style }: { w: number; h: number; children: ReactNode; style?: React.CSSProperties }) => (
  <div className="np-panel" style={{ aspectRatio: `${w} / ${h}`, ...style }}>
    <svg viewBox={`0 0 ${w} ${h}`}>{children}</svg>
  </div>
);
/** Scales a 1600 x 900 room so it covers a w x h panel, keeping the centre. */
const Room = ({ w, h, children }: { w: number; h: number; children: ReactNode }) => {
  const k = Math.max(w / 1600, h / 900);
  return <g transform={`translate(${(w - 1600 * k) / 2} ${(h - 900 * k) / 2}) scale(${k})`}>{children}</g>;
};
/** A person placed inside a panel: x/y are the figure's top-left corner in panel units, h its height. */
const At = ({ x, y, h, role, mood, pose, flip }: { x: number; y: number; h: number; role: Role; mood: Mood; pose?: Pose; flip?: boolean }) => (
  <svg x={x} y={y} width={h * 0.4} height={h} viewBox="0 0 400 1000" overflow="visible">
    <g transform={flip ? "translate(400 0) scale(-1 1)" : undefined}><FigureG role={role} mood={mood} pose={pose} /></g>
  </svg>
);
const Note = ({ children, style }: { children: ReactNode; style: React.CSSProperties }) => <p className="np-note" style={style}>{children}</p>;
const Say = ({ children, style }: { children: ReactNode; style: React.CSSProperties }) => <p className="np-say" style={style}>{children}</p>;
const Tag = ({ kind }: { kind: "R" | "D" }) => <span className={`np-tag np-tag-${kind}`}>{kind === "R" ? "Reconstructed" : "Documented"}</span>;

export function NotPetyaPreview() {
  return (
    <main className="np">
      <header>
        <p className="np-kicker">Stage 3 preview, not in the game</p>
        <h1>BLACKOUT: The NotPetya Incident. Visual direction</h1>
        <p>Flat 2D vector people with one dark outline, solid fills, one shade shape per garment and no gradients. Faces are larger and simpler: eyes, shaped brows, a nose line and one mouth per expression.</p>
      </header>

      <section>
        <h2>The six roles</h2>
        <div className="np-row">{ROLES.map((r) => <figure key={r}><div className="np-fig"><Figure role={r} mood="determination" /></div><figcaption>{ROLE_TITLES[r]}</figcaption></figure>)}</div>
      </section>

      <section>
        <h2>Eight expressions (two characters)</h2>
        {(["it_lead", "ops_manager"] as Role[]).map((r) => (
          <div key={r} className="np-row np-row-8">
            {MOODS.map((m) => <figure key={m}><div className="np-bust"><Figure role={r} mood={m} bust /></div><figcaption>{m}</figcaption></figure>)}
          </div>
        ))}
      </section>

      <section>
        <h2>Expressions on the other four roles</h2>
        <div className="np-row np-row-8">
          {([["terminal_sup", "frustration"], ["terminal_sup", "shock"], ["net_admin", "concentration"], ["net_admin", "suspicion"], ["recovery_lead", "concern"], ["recovery_lead", "relief"], ["customer_rep", "confusion"], ["customer_rep", "frustration"]] as [Role, Mood][]).map(([r, m]) => (
            <figure key={r + m}><div className="np-bust"><Figure role={r} mood={m} bust /></div><figcaption>{ROLE_TITLES[r]}: {m}</figcaption></figure>
          ))}
        </div>
      </section>

      <section>
        <h2>Poses (Network Administrator and Terminal Supervisor)</h2>
        <div className="np-row">{POSES.map((p, i) => <figure key={p}><div className="np-fig"><Figure role={i % 2 ? "terminal_sup" : "net_admin"} mood={i % 2 ? "frustration" : "concentration"} pose={p} /></div><figcaption>{p.replace("_", " ")}</figcaption></figure>)}</div>
      </section>

      <section>
        <h2>Sample environments</h2>
        <div className="np-two">
          <figure><Panel w={1600} h={900}><OfficeDark /></Panel><figcaption>Open-plan office, screens failing</figcaption></figure>
          <figure><Panel w={1600} h={900}><TerminalGate /></Panel><figcaption>Container terminal gate (vehicles bigger than people)</figcaption></figure>
        </div>
      </section>

      <section>
        <h2>A complete sample page: Round 1, "The screens go dark"</h2>
        <p className="np-legend">Boxes are narration. Round bubbles are speech. Each panel carries its evidence tag.</p>
        <div className="np-page">
          <div className="np-wide">
            <Panel w={1600} h={620}>
              <Room w={1600} h={620}><OfficeDark /></Room>
              <At x={260} y={250} h={520} role="it_lead" mood="concern" />
              <At x={1060} y={250} h={520} role="ops_manager" mood="suspicion" flip />
            </Panel>
            <Note style={{ top: "4%", left: "2%", maxWidth: "44%" }}>Tuesday 27 June 2017. Nobody inside yet knows this is not a fault.</Note>
            <Tag kind="R" />
          </div>
          <div className="np-mid">
            <Panel w={1000} h={780}><Room w={1000} h={780}><RansomScreen /></Room></Panel>
            <Note style={{ bottom: "4%", left: "4%", right: "4%", fontSize: ".8rem" }}>Then the message. It asks for money. It will turn out that paying could not bring anything back.</Note>
            <Tag kind="D" />
          </div>
          <div className="np-mid">
            <Panel w={1000} h={780}>
              <Room w={1000} h={780}><OfficeDark /></Room>
              <At x={140} y={90} h={900} role="it_lead" mood="shock" pose="point" />
              <At x={600} y={210} h={900} role="net_admin" mood="concentration" />
            </Panel>
            <Say style={{ top: "5%", left: "40%", maxWidth: "52%" }}>This isn't one machine. It's everything.</Say>
            <Tag kind="R" />
          </div>
        </div>
      </section>
    </main>
  );
}
