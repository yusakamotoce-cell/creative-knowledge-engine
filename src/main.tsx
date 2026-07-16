import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { createBrowserApplicationDependencies } from "./app/compositionRoot";
import "./app/app.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("ROOT_ELEMENT_NOT_FOUND");
}

createRoot(rootElement).render(
  <StrictMode>
    <App dependencies={createBrowserApplicationDependencies()} />
  </StrictMode>,
);
