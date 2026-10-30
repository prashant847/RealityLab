import { ControlDesk, ControlRoom, Office, OfficeDesk } from "./Rooms";
import { FlatControlDesk, FlatControlRoom, FlatOffice, FlatOfficeDesk, FlatTerminal, FlatWarehouse } from "../flat/Scenes";
import { Terminal } from "./Terminal";
import { Warehouse } from "./Warehouse";

export const VECTOR_SCENES = ["warehouse", "control_room", "office", "terminal", "control_desk", "office_desk"] as const;
export type VectorSceneId = (typeof VECTOR_SCENES)[number] | "flat_warehouse" | "flat_control" | "flat_office" | "flat_terminal" | "flat_control_desk" | "flat_office_desk";

/** One of the first page's illustrated environments. `facts` feeds the terminal's rows; the other scenes ignore it. */
export function VectorScene({ scene, facts = [] }: { scene: VectorSceneId; facts?: string[] }) {
  switch (scene) {
    case "warehouse": return <Warehouse />;
    case "control_room": return <ControlRoom />;
    case "office": return <Office />;
    case "terminal": return <Terminal facts={facts} />;
    case "control_desk": return <ControlDesk />;
    case "office_desk": return <OfficeDesk />;
    case "flat_warehouse": return <FlatWarehouse />;
    case "flat_control": return <FlatControlRoom />;
    case "flat_office": return <FlatOffice />;
    case "flat_terminal": return <FlatTerminal facts={facts} />;
    case "flat_control_desk": return <FlatControlDesk />;
    case "flat_office_desk": return <FlatOfficeDesk />;
  }
}
