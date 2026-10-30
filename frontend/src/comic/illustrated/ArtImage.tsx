import { useState } from "react";
import { artUrl, getAsset } from "./artManifest";
import { ArjunPortrait, type ArjunExpression } from "../portraits/Arjun";
import { DirectorPortrait, type DirectorExpression } from "../portraits/Director";
import { NpPerson, type Expr, type StagePose } from "../notpetya/Cast";
import { NpEnv, type EnvId } from "../notpetya/Env";
import { VectorScene } from "../vector/VectorScene";
import { ArjunToon, type ArjunExpression as ToonArjunExpression, type ArjunPose } from "../toons/ArjunToon";
import { DirectorToon, type DirectorExpression as ToonDirectorExpression, type DirectorPose } from "../toons/DirectorToon";
import { PORTRAIT_STYLE, type ArtLayer } from "./scenes";

/** One illustrated layer. A missing id or a failed load shows a visible MISSING box instead of silently hiding. */
export function ArtImage({ layer, facts }: { layer: ArtLayer; facts?: string[] }) {
  const [failed, setFailed] = useState(false);
  const asset = getAsset(layer.asset);
  const box = layer.box;
  if (layer.role === "flatenv" && layer.flatEnv) {
    const fe = layer.flatEnv;
    return <div className="art art--background art--vector" data-art={layer.asset} data-art-status="drawn"><div style={{ position: "absolute", inset: 0, ...(fe.zoom && fe.zoom > 1 ? { transform: `scale(${fe.zoom})`, transformOrigin: `50% ${fe.anchorY ?? 80}%` } : {}) }}><NpEnv env={fe.env as EnvId} props={fe.props} effects={fe.effects} facts={fe.board ? fe.facts : facts ?? fe.facts} board={fe.board} seed={fe.seed} round={fe.round} /></div></div>;
  }
  if (layer.role === "person" && layer.person) {
    const st = box ? { left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` } : undefined;
    return <div className="art art--person" style={st} data-art={layer.asset} data-art-status="drawn"><NpPerson who={layer.person.who} expression={layer.person.expression as Expr} pose={layer.person.pose as StagePose | undefined} /></div>;
  }
  if (layer.role === "vector" && layer.vector) {
    return <div className="art art--background art--vector" data-art={layer.asset} data-art-status="drawn"><VectorScene scene={layer.vector} facts={facts} /></div>;
  }
  if (layer.role === "portrait" && layer.portrait) {
    const st = box ? { left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` } : undefined;
    return (
      <div className="art art--portrait" style={st} data-art={layer.asset} data-art-status="drawn">
        {PORTRAIT_STYLE === "toon"
          ? (layer.portrait.who === "arjun" ? <ArjunToon expression={layer.portrait.expression as ToonArjunExpression} pose={layer.portrait.pose as ArjunPose | undefined} /> : <DirectorToon expression={layer.portrait.expression as ToonDirectorExpression} pose={layer.portrait.pose as DirectorPose | undefined} />)
          : (layer.portrait.who === "arjun" ? <ArjunPortrait expression={layer.portrait.expression as ArjunExpression} /> : <DirectorPortrait expression={layer.portrait.expression as DirectorExpression} />)}
      </div>
    );
  }
  const style = box ? { left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` } : undefined;
  const cls = `art art--${layer.role}${box ? " art--boxed" : ""}`;
  if (!asset || asset.status === "needed" || failed) {
    return <div className={`${cls} art--missing`} style={style} role="img" aria-label={`Missing artwork: ${layer.asset}`} data-art={layer.asset} data-art-status="missing"><span>MISSING ART<br />{layer.asset}</span></div>;
  }
  return (
    <img className={cls} style={style} src={artUrl(asset.path)} alt={layer.role === "background" ? "" : asset.alt} draggable={false}
      data-art={layer.asset} data-art-status={asset.status} onError={() => setFailed(true)} />
  );
}
