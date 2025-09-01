import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeErrorHandling } from './lib/globalErrorHandler';

// Initialize global error handling
initializeErrorHandling();

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
