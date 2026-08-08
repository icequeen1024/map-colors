import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MapColoringLab } from "./MapColoringLab";
import "./globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Map Colors root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <MapColoringLab />
  </StrictMode>,
);
