import { useEffect, useState } from "react";
import type { GameApi } from "../api/client";

/** The player's choices so far in this run (choice ids, in order), read from the server's history. Empty until it arrives or if it cannot be read. */
export function useTrail(api: GameApi, simId: string, runId: string, round: number): string[] {
  const [trail, setTrail] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => api.history(simId, runId))
      .then((h) => { if (live) setTrail(h.decisions.filter((d) => d.round < round).map((d) => d.choice_id)); })
      .catch(() => { if (live) setTrail([]); });
    return () => { live = false; };
  }, [api, simId, runId, round]);
  return trail;
}
