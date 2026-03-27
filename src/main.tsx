import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initInstallPromptCapture } from "./lib/installPrompt";

initInstallPromptCapture();

// Unregister service workers in iframe/preview contexts to prevent stale caches
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

if (isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
