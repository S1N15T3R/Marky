import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import "katex/dist/katex.min.css";
import "./styles/themes/midnight.css";
import "./styles/themes/cyberpunk.css";
import "./styles/themes/solarized.css";
import "./styles/themes/obsidian.css";
import "./styles/themes/paper.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
