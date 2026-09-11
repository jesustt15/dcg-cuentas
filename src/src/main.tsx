import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { DbProvider } from "@/hooks/DbProvider";
import App from "@/App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <DbProvider>
        <App />
      </DbProvider>
    </HashRouter>
  </React.StrictMode>
);