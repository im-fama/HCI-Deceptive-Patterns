import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/shell.css";

// No <StrictMode>: its double-invoked effects would duplicate logged events.
createRoot(document.getElementById("root")!).render(<App />);
