import { useEffect, useState } from "react";
import type { Certificate, Profile, SimsApi } from "../api/sims";

const go = (h: string) => { window.location.hash = h; };
const DOMAIN: Record<Certificate["id"], string> = { blackout: "Operations and cyber response", bhopal: "Industrial safety", covid: "Hospital leadership", circuit: "Electronics", surgery: "Surgery" };
const COLOR: Record<Certificate["id"], string> = { blackout: "blue", bhopal: "orange", covid: "teal", circuit: "pink", surgery: "sky" };
/** The comic picture for each certificate's topic (the same artwork as the simulation itself). */
const ART: Record<Certificate["id"], { src: string; alt: string }> = {
  blackout: { src: "hub/blackout.webp", alt: "Comic panel: a shipping terminal's operations room during a cyber attack" },
  bhopal: { src: "hub/bhopal.webp", alt: "Comic panel: a chemical plant beside a crowded neighbourhood" },
  covid: { src: "hub/covid.webp", alt: "Comic panel: a hospital ward under pressure" },
  circuit: { src: "lab/lc7.webp", alt: "Comic panel: a breadboard circuit with a glowing red LED" },
  surgery: { src: "lab/ls3.webp", alt: "Comic panel: a surgeon preparing the skin for an operation" },
};
const dateOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" }) : "");

/** The printed certificate itself. */
export function CertificateSheet({ cert, name }: { cert: Certificate; name: string }) {
  return (
    <article className={`cert-sheet cert-sheet--${COLOR[cert.id]}`} aria-label={`Certificate: ${cert.title}`}>
      <div className="cert-inner">
        <p className="cert-brand">RealityLab AI</p>
        <h2 className="cert-head">Certificate of mastery</h2>
        <p className="cert-line">This certifies that</p>
        <p className="cert-name">{name}</p>
        <p className="cert-line">made the best possible decision at every step of</p>
        <p className="cert-title">{cert.title}</p>
        <p className="cert-domain">{DOMAIN[cert.id]}{cert.parts.length > 1 ? " · a normal day and the crisis" : " · every step correct"}</p>
        <div className="cert-foot">
          <div><b>{dateOf(cert.earned_at)}</b><small>Date earned</small></div>
          <span className="cert-seal" aria-hidden="true">★</span>
          <div><b>{cert.number}</b><small>Certificate number</small></div>
        </div>
        <p className="cert-fine">Awarded for decision quality inside a simulation. It is not an accredited qualification and says nothing about suitability for a profession.</p>
      </div>
    </article>
  );
}

const SAMPLE_PARTS = (id: Certificate["id"]) => (id === "circuit" || id === "surgery" ? [{ label: "Every step correct", met: true, run_id: null, to: "", at: null }] : [{ label: "A normal day", met: true, run_id: null, to: "", at: null }, { label: "The crisis", met: true, run_id: null, to: "", at: null }]);

/** What a certificate looks like, with your own name and today's date. Opened from Settings; nothing is earned or saved. */
export function CertificatePreview({ api }: { api: SimsApi }) {
  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [name, setName] = useState("");
  const [id, setId] = useState<Certificate["id"]>("bhopal");
  useEffect(() => { api.certificates().then(setCerts).catch(() => setCerts([])); api.profile().then((p) => setName(p.name)).catch(() => undefined); }, [api]);
  const base = certs?.find((c) => c.id === id);
  const sample: Certificate = { id, title: base?.title ?? id, earned: true, earned_at: new Date().toISOString(), number: `RL-${id.slice(0, 3).toUpperCase()}-SAMPLE`, parts: SAMPLE_PARTS(id), run_ids: [] };
  return (
    <main id="main" tabIndex={-1} className="hub-main cert-page">
      <header className="hub-head no-print"><div><p className="hub-eyebrow">Sample</p><h1>What a certificate looks like</h1>
        <p className="hub-lede">This is only a preview. A real certificate is earned by making the best choice at every step of a simulation.</p></div>
        <div className="cert-actions"><button type="button" className="hub-btn" onClick={() => { window.location.hash = "#/settings"; }}>Back to settings</button>
          <button type="button" className="hub-btn hub-btn--primary" onClick={() => { window.location.hash = "#/certificates"; }}>See what is needed</button></div></header>
      <div className="cert-name-row no-print"><label htmlFor="cert-sample">Show the certificate for</label>
        <select id="cert-sample" value={id} onChange={(e) => setId(e.target.value as Certificate["id"])}>
          {(Object.keys(DOMAIN) as Certificate["id"][]).map((k) => <option key={k} value={k}>{certs?.find((c) => c.id === k)?.title ?? k}</option>)}</select></div>
      <div className="cert-sample"><CertificateSheet cert={sample} name={name.trim() || "Student"} /><span className="cert-stamp" aria-hidden="true">Sample</span></div>
    </main>
  );
}

/** One certificate, full size, ready to print or save as a PDF. */
export function CertificateView({ api, id }: { api: SimsApi; id: string }) {
  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    api.certificates().then(setCerts).catch(() => setCerts([]));
    api.profile().then((p) => { setProfile(p); setName(p.name); }).catch(() => undefined);
  }, [api]);
  const cert = certs?.find((c) => c.id === id);
  const save = () => { if (name.trim() && name.trim() !== profile?.name) api.saveProfile({ name: name.trim() }).then(setProfile).catch(() => undefined); };
  return (
    <main id="main" tabIndex={-1} className="hub-main cert-page">
      <header className="hub-head no-print"><div><p className="hub-eyebrow">Certificate</p><h1>{cert?.title ?? "Certificate"}</h1></div>
        <div className="cert-actions"><button type="button" className="hub-btn" onClick={() => go("#/certificates")}>All certificates</button>
          {cert?.earned && <button type="button" className="hub-btn hub-btn--primary" onClick={() => window.print()}>Print or save as PDF</button>}</div></header>
      {!certs && <p className="hub-loading" role="status">Loading…</p>}
      {certs && (!cert || !cert.earned) && (
        <div className="hub-panel"><h2>Not earned yet</h2><p>Make the best choice at every step to earn this certificate.</p>
          <button type="button" className="hub-btn hub-btn--primary" onClick={() => go("#/certificates")}>See what is needed</button></div>)}
      {cert?.earned && (<>
        <div className="cert-name-row no-print"><label htmlFor="cert-name">Name on the certificate</label>
          <input id="cert-name" type="text" value={name} maxLength={60} placeholder="Your name" onChange={(e) => setName(e.target.value)} onBlur={save} />
          {name.trim() && name.trim() !== profile?.name && <button type="button" className="hub-btn" onClick={save}>Save name</button>}</div>
        <CertificateSheet cert={cert} name={name.trim() || "Student"} />
      </>)}
    </main>
  );
}

/** All five certificates: the earned ones to open, the others with exactly what is still needed. */
export function Certificates({ api }: { api: SimsApi }) {
  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.certificates().then(setCerts).catch((e: Error) => setErr(e.message)); }, [api]);
  const got = certs?.filter((c) => c.earned).length ?? 0;
  return (
    <main id="main" tabIndex={-1} className="hub-main">
      <header className="hub-head">
        <div><p className="hub-eyebrow">Earned, not given</p><h1>Certificates</h1>
          <p className="hub-lede">One certificate for each simulation. To earn it, make the best available choice at every step. For BLACKOUT, Bhopal and the hospital that means both the normal day and the crisis.</p></div>
        <div className="hub-stats" aria-label="Certificates earned"><div><strong>{got}/5</strong><span>earned</span></div></div>
      </header>
      {err && <p className="hub-err" role="alert">{err}</p>}
      {!certs && !err && <p className="hub-loading" role="status">Checking your finished runs…</p>}
      <div className="cert-grid">
        {certs?.map((c) => (
          <article key={c.id} className={`cert-card cert-card--${COLOR[c.id]}${c.earned ? " is-earned" : ""}`} aria-labelledby={`ct-${c.id}`}>
            <div className="cert-art"><img src={`${import.meta.env.BASE_URL}assets/scene/${ART[c.id].src}`} alt={ART[c.id].alt} draggable={false} loading="lazy" /></div>
            <span className="cert-medal" aria-hidden="true">{c.earned ? "★" : "🔒"}</span>
            <h2 id={`ct-${c.id}`}>{c.title}</h2>
            <p className="cert-state">{c.earned ? `Earned ${dateOf(c.earned_at)}` : "Not earned yet"}</p>
            <ul className="cert-needs">{c.parts.map((p) => <li key={p.label} className={p.met ? "met" : ""}><i aria-hidden="true">{p.met ? "✓" : "○"}</i>{p.label}</li>)}</ul>
            {c.earned
              ? <button type="button" className="hub-btn hub-btn--primary" onClick={() => go(`#/certificate/${c.id}`)}>View certificate</button>
              : <button type="button" className="hub-btn" onClick={() => go((c.parts.find((p) => !p.met) ?? c.parts[0]).to)}>{c.parts.some((p) => p.met) ? "Finish it" : "Start"}</button>}
          </article>))}
      </div>
    </main>
  );
}
