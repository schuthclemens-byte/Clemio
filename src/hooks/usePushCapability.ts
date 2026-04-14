import { useMemo } from "react";

export interface PushCapability {
  /** Service Worker API available */
  swSupported: boolean;
  /** Notification API available */
  notificationSupported: boolean;
  /** PushManager API available */
  pushSupported: boolean;
  /** Running as installed PWA / standalone */
  isStandalone: boolean;
  /** iOS device detected */
  isIOS: boolean;
  /** iOS but NOT standalone → push won't work */
  isIOSBrowserOnly: boolean;
  /** Overall: push can work in this context */
  canUsePush: boolean;
  /** Human-readable reason if push can't work */
  reason: string | null;
}

export const usePushCapability = (): PushCapability => {
  return useMemo(() => {
    const swSupported = "serviceWorker" in navigator;
    const notificationSupported = "Notification" in window;
    const pushSupported = "PushManager" in window;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as any).standalone;
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isIOSBrowserOnly = isIOS && !isStandalone;

    let canUsePush = swSupported && notificationSupported && pushSupported;
    let reason: string | null = null;

    if (!swSupported || !notificationSupported || !pushSupported) {
      reason = "Dein Browser unterstützt leider keine Benachrichtigungen.";
      canUsePush = false;
    } else if (isIOSBrowserOnly) {
      reason = "Füge die App zum Home-Bildschirm hinzu, um Benachrichtigungen zu erhalten.";
      canUsePush = false;
    }

    return { swSupported, notificationSupported, pushSupported, isStandalone, isIOS, isIOSBrowserOnly, canUsePush, reason };
  }, []);
};
