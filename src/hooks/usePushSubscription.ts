import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY =
  "BL2_0Ki93BHS5ty1Blv8Rxxw0FTgAJEBPq7TN6xk09czbSWSpnINsCBe46uv6LaiKbtkHlwmiiRSDifoFt5ZDVM";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushStatus {
  isStandalone: boolean;
  swActive: boolean;
  permissionGranted: boolean;
  subscriptionCreated: boolean;
  savedToBackend: boolean;
  loading: boolean;
  lastError: string | null;
}

export const usePushSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>({
    isStandalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as any).standalone,
    swActive: false,
    permissionGranted: false,
    subscriptionCreated: false,
    savedToBackend: false,
    loading: false,
    lastError: null,
  });

  const subscribe = useCallback(async (): Promise<boolean> => {
    setStatus((s) => ({ ...s, loading: true, lastError: null }));

    try {
      // Step 1: Check standalone
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        !!(window.navigator as any).standalone;

      setStatus((s) => ({ ...s, isStandalone }));

      if (!isStandalone) {
        throw new Error("App läuft nicht als installierte Web-App");
      }

      // Step 2: Register/get Service Worker
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker nicht unterstützt");
      }

      const registration = await navigator.serviceWorker.ready;
      setStatus((s) => ({ ...s, swActive: true }));

      // Step 3: Request notification permission
      if (!("Notification" in window)) {
        throw new Error("Notifications nicht unterstützt");
      }

      const permission = await Notification.requestPermission();
      setStatus((s) => ({ ...s, permissionGranted: permission === "granted" }));

      if (permission !== "granted") {
        throw new Error(`Berechtigung: ${permission}`);
      }

      // Step 4: Create new push subscription
      // First unsubscribe any existing
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      setStatus((s) => ({ ...s, subscriptionCreated: true }));

      // Step 5: Save to backend
      if (!user) {
        throw new Error("Nicht eingeloggt");
      }

      const subJson = subscription.toJSON();

      // Delete any old subscriptions for this user
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      });

      if (error) {
        throw new Error(`Backend-Speicherung fehlgeschlagen: ${error.message}`);
      }

      setStatus((s) => ({ ...s, savedToBackend: true, loading: false }));
      return true;
    } catch (err) {
      setStatus((s) => ({
        ...s,
        lastError: err instanceof Error ? err.message : String(err),
        loading: false,
      }));
      return false;
    }
  }, [user]);

  return { status, subscribe };
};
