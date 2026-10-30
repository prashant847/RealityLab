import { useMemo } from "react";
import { ComicPanel } from "./ComicPanel";
import { planPage } from "./art/shots";
import type { ComicPageData } from "./types";
import { sanitizePage } from "./validate";

/** Assembles a comic page from structured scene data. Accepts untrusted input: it is sanitised
 *  here, so the renderer cannot be handed arbitrary markup, asset paths or SVG. */
export function ComicPage({ page, title }: { page: ComicPageData | unknown; title?: string }) {
  const { page: safe } = useMemo(() => sanitizePage(page), [page]);
  const layout = useMemo(() => planPage(safe), [safe]);
  return (
    <section className={`comic-page comic-page--${safe.layout}`} aria-label={title ?? "Comic page"} data-layout={safe.layout}
      style={{ ["--cols" as string]: layout.columns }}>
      {safe.panels.map((p, i) => (
        <ComicPanel key={p.id} panel={p} index={i} plan={layout.plans[i]} />
      ))}
    </section>
  );
}
