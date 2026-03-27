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

// One-time push system reset: unsubscribe push + unregister SW + clear local state
const PUSH_RESET_KEY = "clemio_push_reset_v1";
if (!localStorage.getItem(PUSH_RESET_KEY) && "serviceWorker" in navigator) {
  (async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        const sub = await reg.pushManager?.getSubscription();
        if (sub) await sub.unsubscribe();
        await reg.unregister();
      }
      localStorage.removeItem("clemio_push_vapid_public_key");
      localStorage.setItem(PUSH_RESET_KEY, "done");
      console.log("[Push Reset] Service Worker + Push Subscription entfernt");
    } catch (e) {
      console.warn("[Push Reset] Fehler:", e);
      localStorage.setItem(PUSH_RESET_KEY, "done");
    }
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
