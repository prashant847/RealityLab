import type { ReactNode } from "react";

export interface Crumb { label: string; to?: string }

/**
 * The one top bar every full-screen page shares (path, simulation, report), so moving around always looks and works the same:
 * the logo goes home, each earlier crumb is a link back to that page, and the current page is plain text. Status chips sit on the right.
 */
export function AppBar({ crumbs, children, progress }: { crumbs: Crumb[]; children?: ReactNode; progress?: number }) {
  const go = (h: string) => { window.location.hash = h; };
  return (
    <header className="sim-top appbar">
      <a className="appbar-mark" href="#/" aria-label="RealityLab AI home">R</a>
      <nav aria-label="Breadcrumb" className="appbar-crumbs">
        <ol>
          <li><a href="#/" onClick={(e) => { e.preventDefault(); go("#/"); }}>Simulations</a></li>
          {crumbs.map((c, i) => (
            <li key={`${i}-${c.label}`} aria-current={i === crumbs.length - 1 ? "page" : undefined}>
              {c.to && i < crumbs.length - 1 ? <a href={c.to} onClick={(e) => { e.preventDefault(); go(c.to!); }}>{c.label}</a> : <span>{c.label}</span>}
            </li>))}
        </ol>
      </nav>
      <span className="sim-spacer" />
      <div className="appbar-right">{children}</div>
      {progress !== undefined && <div className="sim-topbar" role="progressbar" aria-label="Simulation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>}
    </header>
  );
}
