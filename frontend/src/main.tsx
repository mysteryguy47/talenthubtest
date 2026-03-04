import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Permanently dark mode — apply before render to avoid any flash
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);

