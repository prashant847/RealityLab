import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Shell } from "./shell/Shell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to main content</a>
    <Shell />
  </StrictMode>,
);
