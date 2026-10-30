import type { CharacterId } from "../types";

export type HairStyle = "crop" | "ponytail" | "messy" | "wavy" | "gray_crop" | "bun";
export type Outfit = "blazer_lanyard" | "hivis_vest" | "hoodie" | "blazer_blouse" | "work_jacket" | "lab_coat";

/** One fixed visual identity per character. The renderer never mixes these between characters or panels. */
export interface Look {
  female: boolean;
  skin: string; skinD: string; skinL: string; lip: string;
  hair: string; hairL: string; brow: string;
  hairStyle: HairStyle;
  outfit: Outfit;
  cloth: string; clothD: string; clothL: string; under: string; accent: string; trousers: string;
  jaw: number;           // 0.9 narrow .. 1.12 square
  browThick: number;
  glasses?: boolean; stubble?: number; moustache?: boolean; earring?: boolean; agelines?: number;
}

export const LOOKS: Record<CharacterId, Look> = {
  // Operations Director: the player. Dark crop going grey at the temples, navy jacket, amber lanyard.
  player: { female: false, skin: "#b58762", skinD: "#80583f", skinL: "#cfa07b", lip: "#8b5246", hair: "#1b1a1e", hairL: "#8d9199", brow: "#18171a",
    hairStyle: "crop", outfit: "blazer_lanyard", cloth: "#1c2c47", clothD: "#101c31", clothL: "#2c4468", under: "#c9d1dc", accent: "#e8a33d", trousers: "#151c2a",
    jaw: 1.04, browThick: 10, stubble: 0.15, agelines: 0.5 },
  // Kavya Rao, Safety Chief: hair scraped back into a ponytail, hi-vis vest over a charcoal shirt.
  kavya: { female: true, skin: "#a96f4d", skinD: "#744730", skinL: "#c28660", lip: "#7e4338", hair: "#150f0e", hairL: "#4a3a36", brow: "#120d0c",
    hairStyle: "ponytail", outfit: "hivis_vest", cloth: "#c98a2c", clothD: "#8a5a17", clothL: "#e3a84a", under: "#2b313b", accent: "#d6dbe2", trousers: "#1d232d",
    jaw: 0.97, browThick: 8, agelines: 0.35 },
  // Arjun Mehta, IT & Systems Lead: glasses, untidy black hair, steel-blue hoodie.
  arjun: { female: false, skin: "#9b6a4a", skinD: "#6c432d", skinL: "#b9825e", lip: "#7a4438", hair: "#0c0b0f", hairL: "#3a3944", brow: "#0c0b0f",
    hairStyle: "messy", outfit: "hoodie", cloth: "#3a526f", clothD: "#23364f", clothL: "#52708f", under: "#c5ced9", accent: "#8aa3bd", trousers: "#1a2230",
    jaw: 0.95, browThick: 10, glasses: true, stubble: 0.28 },
  // Nisha Sen, Finance Director: shoulder-length waves, charcoal blazer, steel blouse.
  nisha: { female: true, skin: "#b57d5a", skinD: "#7f523b", skinL: "#cf9772", lip: "#86473e", hair: "#1c1316", hairL: "#5b4348", brow: "#171012",
    hairStyle: "wavy", outfit: "blazer_blouse", cloth: "#2a2f3b", clothD: "#171b24", clothL: "#3d4556", under: "#6d8bab", accent: "#d6dbe2", trousers: "#171b24",
    jaw: 0.94, browThick: 7, earring: true, agelines: 0.3 },
  // Raghav Verma, Logistics Manager: grey crop, moustache, heavy brow, weathered work jacket with an amber stripe.
  raghav: { female: false, skin: "#8d5f42", skinD: "#5f3b29", skinL: "#aa7753", lip: "#6f4034", hair: "#7c8188", hairL: "#b4b8bf", brow: "#5b5f66",
    hairStyle: "gray_crop", outfit: "work_jacket", cloth: "#38433f", clothD: "#222b29", clothL: "#4e5c57", under: "#aeb7c1", accent: "#e8a33d", trousers: "#232b2e",
    jaw: 1.12, browThick: 14, stubble: 0.45, moustache: true, agelines: 0.9 },
  // Dr. Isha Kapoor, Hospital Liaison: hair in a high bun, white coat over teal scrubs, stethoscope.
  isha: { female: true, skin: "#bf8a65", skinD: "#8a5d43", skinL: "#d6a37c", lip: "#8a4a3f", hair: "#130f0f", hairL: "#463836", brow: "#110d0d",
    hairStyle: "bun", outfit: "lab_coat", cloth: "#d7dce3", clothD: "#9ba6b6", clothL: "#eef1f5", under: "#3b7f86", accent: "#30343c", trousers: "#2a323d",
    jaw: 0.93, browThick: 7, earring: true },
};
