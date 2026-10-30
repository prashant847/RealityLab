import { FlatEnv, PERSON_UNITS } from "./World";
import { FlatPerson, type Expr, type Pose, type Who } from "./Person";

// The landing-page picture: the director and the team on the warehouse floor in the blackout, in the same flat style and scale as the comic.
const LINEUP: { who: Who; x: number; expr: Expr; pose?: Pose; big?: boolean }[] = [
  { who: "kavya", x: 12, expr: "concerned", pose: "arms_crossed" },
  { who: "arjun", x: 27, expr: "concerned", pose: "clipboard" },
  { who: "director", x: 50, expr: "determined", pose: "arms_crossed", big: true },
  { who: "nisha", x: 73, expr: "concerned", pose: "clipboard" },
  { who: "raghav", x: 88, expr: "neutral" },
];
const RATIO = 2.1;

export function HeroScene() {
  const visible = 1600 / RATIO;           // scene units visible top to bottom of the picture
  const zoom = 1.3;
  const personH = ((PERSON_UNITS * zoom) / visible) * 100 / 0.966;
  return (
    <div className="hero-scene" role="img" aria-label="The Operations Director with Kavya, Arjun, Nisha and Raghav on a warehouse floor in a blackout, warning lights flashing." style={{ aspectRatio: `${RATIO}` }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "50% 80%" }}>
        <FlatEnv env="warehouse_floor" effects={["power_failure", "warning_lights"]} seed={4} />
      </div>
      {LINEUP.map((p) => {
        const h = personH * (p.big ? 1.06 : 1), w = (0.4 * h) / RATIO;
        return <div key={p.who} className="hero-person" style={{ left: `${p.x - w / 2}%`, top: `${90 - h * 0.966}%`, width: `${w}%`, height: `${h}%` }}><FlatPerson who={p.who} expression={p.expr} pose={p.pose} /></div>;
      })}
    </div>
  );
}
