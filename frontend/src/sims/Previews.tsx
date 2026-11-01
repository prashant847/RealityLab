/** Illustrations for the library cards and intro screens: hand-inked comic pictures (public/assets/scene/hub/<id>.webp). They fill their frame and drift gently unless reduce-motion is on. */
const ALT: Record<"blackout" | "bhopal" | "covid", string> = {
  blackout: "Comic panel: a computer screen locked by a red ransom warning",
  bhopal: "Comic panel: a chemical plant at night, a big storage tank, a flare stack and a glowing warning lamp",
  covid: "Comic panel: a busy hospital ward with beds, a heart monitor and oxygen cylinders",
};
export function Preview({ id }: { id: "blackout" | "bhopal" | "covid" }) {
  return <img className="pv" src={`${import.meta.env.BASE_URL}assets/scene/hub/${id}.webp`} alt={ALT[id]} draggable={false} />;
}
