import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY =
  "BCu2QLymgXQiRVIlG9aQXl0SNzq0L-ZwJZ7HuSMRntC0mX8lfN3IDeKk_5Heo3wKVPDr56VjhKuVIGr1KyfoNB0";

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

function getServiceWorkerState(registration: ServiceWorkerRegistration | null) {
  return registration?.active?.state || registration?.waiting?.state || registration?.installing?.state || null;
}

export interface PushDebugInfo {
  swRegistered: boolean;
  swState: string | null;
  notificationPermission: NotificationPermission | "unsupported";
  pushSubscription: boolean;
  backendSubscription: boolean;
  backendEndpointMatches: boolean | null;
  subscriptionEndpoint: string | null;
  lastPushSuccess: boolean | null;
  lastError: string | null;
  lastTestResponse: string | null;
  lastServiceWorkerEvent: string | null;
  isStandalone: boolean;
  loading: boolean;
}

interface PushTestResult {
  ok: boolean;
  sent: number;
  response: string;
}

export const usePushSubscription = () => {
  const { user } = useAuth();
  const [debug, setDebug] = useState<PushDebugInfo>({
    swRegistered: false,
    swState: null,
    notificationPermission: "unsupported",
    pushSubscription: false,
    backendSubscription: false,
    backendEndpointMatches: null,
    subscriptionEndpoint: null,
    lastPushSuccess: null,
    lastError: null,
    lastTestResponse: null,
    lastServiceWorkerEvent: null,
    isStandalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as any).standalone,
    loading: true,
  });

  const updateDebug = useCallback((partial: Partial<PushDebugInfo>) => {
    setDebug((prev) => ({ ...prev, ...partial }));
  }, []);

  const refreshStatus = useCallback(async () => {
    const swSupported = "serviceWorker" in navigator;
    const notifSupported = "Notification" in window;

    if (!swSupported || !notifSupported) {
      updateDebug({
        swRegistered: false,
        swState: null,
        notificationPermission: notifSupported ? Notification.permission : "unsupported",
        pushSubscription: false,
        backendSubscription: false,
        backendEndpointMatches: null,
        subscriptionEndpoint: null,
        loading: false,
      });
      return null;
    }

    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const browserEndpoint = subscription?.endpoint ?? null;

      let backendRows: Array<{ endpoint: string }> = [];
      if (user) {
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("endpoint")
          .eq("user_id", user.id);

        if (error) {
          throw new Error(error.message);
        }

        backendRows = data ?? [];
      }

      const backendSubscription = backendRows.length > 0;
      const backendEndpointMatches = browserEndpoint
        ? backendRows.some((row) => row.endpoint === browserEndpoint)
        : backendSubscription
          ? false
          : null;

      updateDebug({
        swRegistered: true,
        swState: getServiceWorkerState(registration),
        notificationPermission: Notification.permission,
        pushSubscription: !!subscription,
        backendSubscription,
        backendEndpointMatches,
        subscriptionEndpoint: browserEndpoint,
        loading: false,
      });

      return { registration, subscription };
    } catch (err) {
      updateDebug({
        lastError: err instanceof Error ? err.message : String(err),
        loading: false,
      });
      return null;
    }
  }, [updateDebug, user]);

  useEffect(() => {
    updateDebug({ loading: true });
    refreshStatus();
  }, [refreshStatus, updateDebug]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "SW_DEBUG") return;
      updateDebug({
        lastServiceWorkerEvent: `${event.data.phase}: ${event.data.message}`,
      });
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [updateDebug]);

  const subscribe = useCallback(async () => {
    updateDebug({ loading: true, lastError: null, lastPushSuccess: null, lastTestResponse: null });

    try {
      if (!("Notification" in window)) {
        throw new Error("Notifications nicht unterstützt in diesem Browser");
      }

      const permission = await Notification.requestPermission();
      updateDebug({ notificationPermission: permission });

      if (permission !== "granted") {
        throw new Error(`Notification-Berechtigung: ${permission}`);
      }

      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      if (user) {
        const subJson = subscription.toJSON();

        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

        const { error } = await supabase.from("push_subscriptions").insert({
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        });

        if (error) {
          throw new Error(`Subscription speichern fehlgeschlagen: ${error.message}`);
        }
      }

      updateDebug({
        lastServiceWorkerEvent: "subscription: neue Push-Subscription erstellt",
      });
      await refreshStatus();
      updateDebug({ loading: false });
      return true;
    } catch (err) {
      updateDebug({
        lastError: err instanceof Error ? err.message : String(err),
        loading: false,
      });
      return false;
    }
  }, [refreshStatus, updateDebug, user]);

  const sendTestPush = useCallback(async (): Promise<PushTestResult> => {
    if (!user) {
      return { ok: false, sent: 0, response: "Keine aktive Sitzung" };
    }

    updateDebug({ lastPushSuccess: null, lastError: null, lastServiceWorkerEvent: null });

    try {
      await refreshStatus();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Keine aktive Session");
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          title: "🔔 Clemio Test",
          body: "Push-Benachrichtigungen funktionieren!",
          data: { source: "manual-test" },
        }),
      });

      const data = await res.json();
      const response = JSON.stringify(data);
      const success = res.ok && (data?.sent ?? 0) > 0;

      updateDebug({
        lastPushSuccess: success,
        lastError: success ? null : data?.error ?? response,
        lastTestResponse: response,
      });

      return {
        ok: success,
        sent: data?.sent ?? 0,
        response,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateDebug({
        lastPushSuccess: false,
        lastError: message,
        lastTestResponse: message,
      });
      return { ok: false, sent: 0, response: message };
    }
  }, [refreshStatus, updateDebug, user]);

  return { debug, subscribe, sendTestPush, refreshStatus };
};