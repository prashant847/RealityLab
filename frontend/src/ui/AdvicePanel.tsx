import type { Advice } from "../api/types";
import { Portrait } from "../comic/Portrait";

const VERDICT_LABEL = { support: "recommends", oppose: "advises against", caution: "has reservations about", neutral: "" } as const;

function Avatar({ id }: { id: Advice["stakeholder"] }) {
  return <div className="advice-avatar"><Portrait id={id} emotion="composure" expression="speaking" /></div>;
}

export function AdviceCard({ advice }: { advice: Advice }) {
  const unverified = advice.private.filter((p) => !p.verified);
  const tone = advice.confidence >= 65 ? "good" : advice.confidence >= 45 ? "warn" : "bad";
  return (
    <article className="advice" aria-label={`Advice from ${advice.name}`}>
      <Avatar id={advice.stakeholder} />
      <div className="advice-body">
        <header>
          <strong>{advice.name}</strong> <span className="role">{advice.role}</span>
          <span className={`tag tag--${advice.source === "llm" ? "warn" : "plain"}`}
            title={advice.source === "llm" ? "Wording written by an AI model from the same facts. The recommendation itself always comes from fixed rules." : "Written from fixed rules; no AI model involved."}>
            {advice.source === "llm" ? "AI-phrased" : "Rule-based"}
          </span>
        </header>
        <blockquote>{advice.dialogue}</blockquote>
        {advice.reaction_text && <p className="advice-reaction"><em>On your last decision:</em> {advice.reaction_text}</p>}
        <div className="meter" data-tone={tone}>
          <div className="meter-head"><span>Confidence in this advice</span><b>{advice.confidence}%</b></div>
          <div className="meter-track" role="meter" aria-label={`${advice.name} confidence`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={advice.confidence}>
            <div className="meter-fill" style={{ width: `${advice.confidence}%` }} />
          </div>
        </div>
        {unverified.map((p, i) => (
          <p key={i} className="unverified" role="note"><b>Unverified:</b> check this before relying on it ({Math.round(p.reliability * 100)}% sure themselves).</p>
        ))}
        <details>
          <summary>What {advice.name.split(" ")[0]} is basing this on</summary>
          <ul>{advice.facts.map((f, i) => <li key={`f${i}`}>{f}</li>)}{advice.private.map((p, i) => <li key={`p${i}`}>{p.text}{p.verified ? "" : " (unverified)"}</li>)}</ul>
          <h4>View of each option</h4>
          <ul className="stances">
            {advice.stances.map((s) => (
              <li key={s.choice_id} data-verdict={s.verdict}>
                <strong>{s.verdict === "neutral" ? "No strong view on" : `${advice.name.split(" ")[0]} ${VERDICT_LABEL[s.verdict]}`}</strong> {s.label}
                {s.reasons[0] && <span className="muted"> — {s.reasons[0]}</span>}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}

export function AdvicePanel({ advice }: { advice: Advice[] }) {
  if (advice.length === 0) return null;
  return (
    <section className="card advice-panel" aria-labelledby="advice-h">
      <h2 id="advice-h">Advice from your team</h2>
      <p className="muted">Advisors have different priorities and limited information. Their advice is a view, not an instruction, and the decision is yours.</p>
      {advice.map((a) => <AdviceCard key={a.stakeholder} advice={a} />)}
    </section>
  );
}
