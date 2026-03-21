type InstallPromptChoice = {
  outcome: "accepted" | "dismissed";
};

export interface DeferredInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<InstallPromptChoice>;
}

type InstallPromptListener = (prompt: DeferredInstallPromptEvent | null) => void;

let deferredPrompt: DeferredInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<InstallPromptListener>();

const notify = () => {
  listeners.forEach((listener) => listener(deferredPrompt));
};

export const initInstallPromptCapture = () => {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as DeferredInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
};

export const getDeferredInstallPrompt = () => deferredPrompt;

export const clearDeferredInstallPrompt = () => {
  deferredPrompt = null;
  notify();
};

export const subscribeToInstallPrompt = (listener: InstallPromptListener) => {
  listeners.add(listener);
  listener(deferredPrompt);

  return () => {
    listeners.delete(listener);
  };
};
