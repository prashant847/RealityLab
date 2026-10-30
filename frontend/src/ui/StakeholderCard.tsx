import { characterInfo } from "../comic/assets";
import { Portrait } from "../comic/Portrait";
import type { CharacterId } from "../comic/types";

export function StakeholderCard({ id, trust, quote, onAsk, disabled, asked }: {
  id: Exclude<CharacterId, "player">; trust: number; quote?: string; onAsk?: () => void; disabled?: boolean; asked?: boolean;
}) {
  const { name, role } = characterInfo(id);
  const tone = trust >= 60 ? "good" : trust >= 35 ? "warn" : "bad";
  return (
    <article className="stakeholder" aria-label={`${name}, ${role}`}>
      <div className="stakeholder-avatar">
        <Portrait id={id} emotion={trust >= 60 ? "composure" : trust >= 35 ? "concern" : "frustration"} />
      </div>
      <div className="stakeholder-body">
        <strong>{name}</strong>
        <span className="role">{role}</span>
        <div className="meter" data-tone={tone}>
          <div className="meter-head"><span>Trust in you</span><b>{trust}%</b></div>
          <div className="meter-track" role="meter" aria-label={`${name} trust`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={trust}>
            <div className="meter-fill" style={{ width: `${trust}%` }} />
          </div>
        </div>
        {quote && <blockquote>{quote}</blockquote>}
        {asked && <p className="asked" role="status">Advice given — see below</p>}
        {onAsk && !asked && <button type="button" className="ghost small" onClick={onAsk} disabled={disabled} aria-label={`Ask ${name} for advice`}>Ask for advice</button>}
      </div>
    </article>
  );
}
