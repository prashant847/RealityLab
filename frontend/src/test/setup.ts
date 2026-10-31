import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// The suite is heavy; under full parallel load an async wait that takes about a second alone can take several.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => cleanup());
