import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "highlight.js/styles/atom-one-dark.css";
import "katex/dist/katex.min.css";

createRoot(document.getElementById("root")!).render(<App />);
