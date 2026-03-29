import { useState, useCallback, useEffect } from "react";
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

/** Get SW registration with a timeout – never hangs */
async function getSwRegistration(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  // Try to register SW first (idempotent if already registered)
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // SW file might not exist in dev/preview – that's ok
  }

  // Race: wait for ready vs timeout
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export interface PushStatus {
  isStandalone: boolean;
  swActive: boolean;
  permissionGranted: boolean;
  subscriptionCreated: boolean;
  savedToBackend: boolean;
  loading: boolean;
  lastError: string | null;
  initialCheckDone: boolean;
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
    initialCheckDone: false,
  });

  // Check on mount if user already has a valid push subscription
  useEffect(() => {
    if (!user) {
      setStatus((s) => ({ ...s, initialCheckDone: true }));
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        console.log("[Push] Checking existing subscription...");
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint")
          .eq("user_id", user.id)
          .limit(1);

        if (cancelled) return;

        if (!data || data.length === 0) {
          console.log("[Push] No subscription in DB → prompt will show");
          return;
        }

        const dbEndpoint = data[0].endpoint;

        // Check browser-side state with timeout
        const permOk = "Notification" in window && Notification.permission === "granted";
        let browserEndpoint: string | null = null;

        const reg = await getSwRegistration(2000);
        if (reg) {
          try {
            const sub = await reg.pushManager.getSubscription();
            browserEndpoint = sub?.endpoint || null;
          } catch { /* ignore */ }
        }

        if (cancelled) return;

        if (browserEndpoint && browserEndpoint === dbEndpoint) {
          console.log("[Push] Browser subscription matches DB → saved");
          setStatus((s) => ({
            ...s,
            savedToBackend: true,
            swActive: true,
            permissionGranted: permOk,
            subscriptionCreated: true,
          }));
        } else if (browserEndpoint && browserEndpoint !== dbEndpoint) {
          // Only delete if we got a DIFFERENT subscription (not just missing/timeout)
          console.log("[Push] Browser has different endpoint → deleting stale DB entry");
          await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
        } else {
          // No browser subscription found (SW not ready / timeout) – trust the DB entry
          console.log("[Push] No browser sub (SW not ready) → trusting DB entry");
          setStatus((s) => ({
            ...s,
            savedToBackend: true,
            permissionGranted: permOk,
          }));
        }
      } catch (e) {
        console.warn("[Push] Mount check error:", e);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setStatus((s) => ({ ...s, loading: true, lastError: null }));
    console.log("[Push] Subscribe started");

    try {
      // Step 1: Platform check
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        !!(window.navigator as any).standalone;

      setStatus((s) => ({ ...s, isStandalone }));

      const ua = navigator.userAgent || "";
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      if (isIOS && !isStandalone) {
        throw new Error("Auf iOS muss die App zum Home-Bildschirm hinzugefügt werden");
      }

      // Step 2: Get Service Worker (with registration + timeout)
      const registration = await getSwRegistration(5000);
      if (!registration) {
        throw new Error("Service Worker konnte nicht gestartet werden");
      }
      console.log("[Push] SW ready");
      setStatus((s) => ({ ...s, swActive: true }));

      // Step 3: Request notification permission
      if (!("Notification" in window)) {
        throw new Error("Notifications nicht unterstützt");
      }

      const permission = await Notification.requestPermission();
      console.log("[Push] Permission:", permission);
      setStatus((s) => ({ ...s, permissionGranted: permission === "granted" }));

      if (permission !== "granted") {
        throw new Error(`Berechtigung: ${permission}`);
      }

      // Step 4: Create push subscription
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      console.log("[Push] Subscription created");
      setStatus((s) => ({ ...s, subscriptionCreated: true }));

      // Step 5: Save to backend
      if (!user) {
        throw new Error("Nicht eingeloggt");
      }

      const subJson = subscription.toJSON();

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

      console.log("[Push] Saved to backend ✓");
      setStatus((s) => ({ ...s, savedToBackend: true, loading: false }));
      return true;
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
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
