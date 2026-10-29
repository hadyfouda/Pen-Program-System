import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// Security purge: Wipe any old persistent login states from localStorage
try {
  localStorage.removeItem("eva_ms_user_session_v1");
  localStorage.removeItem("eva_ms_user_session");
  localStorage.removeItem("eva_ms_user");
  sessionStorage.removeItem("eva_ms_session_active");
} catch {
  // Ignore
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
