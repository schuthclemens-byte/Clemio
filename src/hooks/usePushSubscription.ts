import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY =
  "BFbpN0lfxPol0eL75dZcjzg_sgY7ExryL-Y7PNga9HnQ8yhExA9poi8tAATb2UQiWy9-W5gBgvy_CLP_0pNeSqs";

/** localStorage key: set to "true" once push is fully saved */
const PUSH_SAVED_KEY = "clemio_push_saved";
/** localStorage key: set to "denied" if user declined permission */
const PUSH_DENIED_KEY = "clemio_push_denied";

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

async function getSwRegistration(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch { /* SW file might not exist in dev/preview */ }
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export type PushState =
  | "unknown"        // initial, checking
  | "unsupported"    // browser/platform can't do push
  | "denied"         // user denied Notification permission
  | "prompt-ready"   // can ask user (permission=default, no sub)
  | "subscribing"    // currently subscribing
  | "active"         // subscription exists and saved
  | "error";         // something went wrong

export interface PushStatus {
  state: PushState;
  loading: boolean;
  lastError: string | null;
  /** Legacy compat flags */
  isStandalone: boolean;
  swActive: boolean;
  permissionGranted: boolean;
  subscriptionCreated: boolean;
  savedToBackend: boolean;
  initialCheckDone: boolean;
}

export const usePushSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>({
    state: "unknown",
    loading: false,
    lastError: null,
    isStandalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as any).standalone,
    swActive: false,
    permissionGranted: false,
    subscriptionCreated: false,
    savedToBackend: false,
    initialCheckDone: false,
  });

  // ── Mount check: determine push state silently ──
  useEffect(() => {
    if (!user) {
      console.log("[Push] No user → skip check");
      setStatus((s) => ({ ...s, state: "unknown", initialCheckDone: true }));
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        // 1) Check browser permission first
        const permission = "Notification" in window ? Notification.permission : "denied";
        console.log("[Push] Mount check — permission:", permission);

        if (permission === "denied") {
          console.log("[Push] Permission denied → state=denied, no prompt ever");
          localStorage.setItem(PUSH_DENIED_KEY, "true");
          if (!cancelled) {
            setStatus((s) => ({
              ...s,
              state: "denied",
              permissionGranted: false,
              initialCheckDone: true,
            }));
          }
          return;
        }

        // 2) Check DB for existing subscription
        const { data: dbRows } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint")
          .eq("user_id", user.id)
          .limit(1);

        if (cancelled) return;

        const dbEntry = dbRows && dbRows.length > 0 ? dbRows[0] : null;

        // 3) Check browser-side subscription (with timeout for slow SW)
        let browserEndpoint: string | null = null;
        let browserSubscription: PushSubscription | null = null;
        const reg = await getSwRegistration(2000);
        if (reg) {
          try {
            browserSubscription = await reg.pushManager.getSubscription();
            browserEndpoint = browserSubscription?.endpoint || null;
          } catch { /* ignore */ }
        }

        if (cancelled) return;

        console.log("[Push] Mount check — DB entry:", !!dbEntry, "| Browser sub:", !!browserEndpoint);

        // ── Case A: Both exist and match → all good
        if (browserEndpoint && dbEntry && browserEndpoint === dbEntry.endpoint) {
          console.log("[Push] Case A: Browser + DB match → active");
          localStorage.setItem(PUSH_SAVED_KEY, "true");
          localStorage.removeItem(PUSH_DENIED_KEY);
          if (!cancelled) {
            setStatus((s) => ({
              ...s,
              state: "active",
              swActive: true,
              permissionGranted: permission === "granted",
              subscriptionCreated: true,
              savedToBackend: true,
            }));
          }
          return;
        }

        // ── Case B: Browser sub exists but DB is missing/mismatched → silent re-save
        if (browserEndpoint && browserSubscription && permission === "granted") {
          console.log("[Push] Case B: Browser sub exists, DB missing/stale → silent re-save");
          const subJson = browserSubscription.toJSON();
          // Delete old entries first
          await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
          const { error } = await supabase.from("push_subscriptions").insert({
            user_id: user.id,
            endpoint: subJson.endpoint!,
            p256dh: subJson.keys!.p256dh!,
            auth: subJson.keys!.auth!,
          });
          if (error) {
            console.warn("[Push] Case B: Silent save failed:", error.message);
          } else {
            console.log("[Push] Case B: Silent save OK → active");
            localStorage.setItem(PUSH_SAVED_KEY, "true");
            localStorage.removeItem(PUSH_DENIED_KEY);
            if (!cancelled) {
              setStatus((s) => ({
                ...s,
                state: "active",
                swActive: true,
                permissionGranted: true,
                subscriptionCreated: true,
                savedToBackend: true,
              }));
            }
            return;
          }
        }

        // ── Case: DB entry exists but no browser sub (SW timeout on mobile) → trust DB
        if (dbEntry && !browserEndpoint) {
          console.log("[Push] DB entry exists, SW not ready → trusting DB, state=active");
          localStorage.setItem(PUSH_SAVED_KEY, "true");
          if (!cancelled) {
            setStatus((s) => ({
              ...s,
              state: "active",
              savedToBackend: true,
              permissionGranted: permission === "granted",
            }));
          }
          return;
        }

        // ── Case: DB entry endpoint differs from browser → stale, delete DB
        if (dbEntry && browserEndpoint && dbEntry.endpoint !== browserEndpoint) {
          console.log("[Push] Endpoint mismatch → deleting stale DB entry");
          await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
          localStorage.removeItem(PUSH_SAVED_KEY);
        }

        // ── Case C/E: No subscription, permission is default or granted
        if (permission === "default") {
          console.log("[Push] Permission default, no sub → prompt-ready");
          if (!cancelled) {
            setStatus((s) => ({ ...s, state: "prompt-ready" }));
          }
        } else if (permission === "granted") {
          // Granted but no subscription — could re-subscribe but only on user action
          console.log("[Push] Permission granted but no sub → prompt-ready for re-subscribe");
          if (!cancelled) {
            setStatus((s) => ({
              ...s,
              state: "prompt-ready",
              permissionGranted: true,
            }));
          }
        }
      } catch (e) {
        console.warn("[Push] Mount check error:", e);
      } finally {
        if (!cancelled) {
          setStatus((s) => ({ ...s, initialCheckDone: true }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // ── Subscribe: called only by explicit user action ──
  const subscribe = useCallback(async (): Promise<boolean> => {
    setStatus((s) => ({ ...s, state: "subscribing", loading: true, lastError: null }));
    console.log("[Push] Subscribe started (user action)");

    try {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        !!(window.navigator as any).standalone;

      const ua = navigator.userAgent || "";
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (isIOS && !isStandalone) {
        throw new Error("Auf iOS muss die App zum Home-Bildschirm hinzugefügt werden");
      }

      // Get SW
      const registration = await getSwRegistration(5000);
      if (!registration) throw new Error("Service Worker konnte nicht gestartet werden");
      console.log("[Push] SW ready");

      // Request permission (only happens here, on user action)
      if (!("Notification" in window)) throw new Error("Notifications nicht unterstützt");
      const permission = await Notification.requestPermission();
      console.log("[Push] Permission result:", permission);

      if (permission !== "granted") {
        localStorage.setItem(PUSH_DENIED_KEY, "true");
        localStorage.removeItem(PUSH_SAVED_KEY);
        setStatus((s) => ({
          ...s,
          state: "denied",
          permissionGranted: false,
          loading: false,
        }));
        throw new Error(`Berechtigung: ${permission}`);
      }

      // Create subscription
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      console.log("[Push] Subscription created");

      // Save to backend
      if (!user) throw new Error("Nicht eingeloggt");
      const subJson = subscription.toJSON();

      // Upsert: delete old, insert new
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      });

      if (error) throw new Error(`Backend-Speicherung fehlgeschlagen: ${error.message}`);

      console.log("[Push] Saved to backend ✓ → state=active");
      localStorage.setItem(PUSH_SAVED_KEY, "true");
      localStorage.removeItem(PUSH_DENIED_KEY);
      setStatus((s) => ({
        ...s,
        state: "active",
        swActive: true,
        permissionGranted: true,
        subscriptionCreated: true,
        savedToBackend: true,
        loading: false,
      }));
      return true;
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      setStatus((s) => ({
        ...s,
        state: s.state === "denied" ? "denied" : "error",
        lastError: err instanceof Error ? err.message : String(err),
        loading: false,
      }));
      return false;
    }
  }, [user]);

  return { status, subscribe };
};
