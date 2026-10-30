import type { ComicPageData } from "../comic/types";

/** The first page of the original (pre-NotPetya) story, kept only so the tests of the superseded hand-scripted pages still have the page those scripts were written for. */
export const legacyRound1Page = {
  layout: "three",
  panels: [
    { id: "r1a", environment: "warehouse_floor", characters: [], effects: ["power_failure", "warning_lights"], narration: "8:40 PM. Every screen on the warehouse floor goes dark at once.", dialogue: [] },
    { id: "r1b", environment: "warehouse_floor", characters: [{ id: "arjun", expression: "worried", side: "left" }, { id: "player", expression: "determined", side: "right" }], effects: [], narration: null, dialogue: [{ speaker: "arjun", text: "Scanners are dead. And these logins — none of them are ours.", kind: "speech" }] },
    { id: "r1c", environment: "control_room", characters: [{ id: "arjun", expression: "calm", side: "left" }], effects: ["system_alert"], narration: null, dialogue: [{ speaker: "arjun", text: "I can't tell you what this is yet. Only that it isn't routine.", kind: "speech" }] },
  ],
} as unknown as ComicPageData;
