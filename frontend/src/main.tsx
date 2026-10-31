import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Shell } from "./shell/Shell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
