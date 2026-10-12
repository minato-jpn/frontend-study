import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { DbClient, DbProvider } from "@tanstack/react-db";

const dbClient = new DbClient();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DbProvider client={dbClient}>
      <App />
    </DbProvider>
  </StrictMode>,
);
