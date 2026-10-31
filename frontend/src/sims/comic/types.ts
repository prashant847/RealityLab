import type { ReactNode } from "react";

/** One page of a comic: how it is drawn, a description for screen readers, and what read-aloud says. */
export interface ComicPage { id: string; alt: string; spoken: string; render: () => ReactNode }
