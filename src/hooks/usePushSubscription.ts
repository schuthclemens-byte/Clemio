import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY =
  "BMNPLUnCNDmHxeNFyTMIp1ZoPlq36VoiDuEIQnh9SFVKbzAHb1NzRS_BNj1ndnfklLMhobepS0TCIjyiSPci_hY";

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

export interface PushDebugInfo {
  swRegistered: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  pushSubscription: boolean;
  lastPushSuccess: boolean | null;
  lastError: string | null;
  isStandalone: boolean;
  loading: boolean;
}

export const usePushSubscription = () => {
  const { user } = useAuth();
  const [debug, setDebug] = useState<PushDebugInfo>({
    swRegistered: false,
    notificationPermission: "unsupported",
    pushSubscription: false,
    lastPushSuccess: null,
    lastError: null,
    isStandalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as any).standalone,
    loading: true,
  });

  const updateDebug = useCallback((partial: Partial<PushDebugInfo>) => {
    setDebug((prev) => ({ ...prev, ...partial }));
  }, []);

  // Check current state on mount
  useEffect(() => {
    const check = async () => {
      const swSupported = "serviceWorker" in navigator;
      const notifSupported = "Notification" in window;

      if (!swSupported || !notifSupported) {
        updateDebug({
          swRegistered: false,
          notificationPermission: notifSupported
            ? Notification.permission
            : "unsupported",
          loading: false,
        });
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const hasSubscription = registration
          ? !!(await registration.pushManager?.getSubscription())
          : false;

        updateDebug({
          swRegistered: !!registration,
          notificationPermission: Notification.permission,
          pushSubscription: hasSubscription,
          loading: false,
        });
      } catch (err) {
        updateDebug({
          lastError: String(err),
          loading: false,
        });
      }
    };
    check();
  }, [updateDebug]);

  // Subscribe to push
  const subscribe = useCallback(async () => {
    updateDebug({ loading: true, lastError: null });

    try {
      if (!("Notification" in window)) {
        throw new Error("Notifications nicht unterstützt in diesem Browser");
      }

      const permission = await Notification.requestPermission();
      updateDebug({ notificationPermission: permission });

      if (permission !== "granted") {
        throw new Error(`Notification-Berechtigung: ${permission}`);
      }

      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker nicht unterstützt");
      }

      const registration = await navigator.serviceWorker.ready;
      updateDebug({ swRegistered: true });

      // Always get fresh subscription - unsubscribe old one first if exists
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Re-subscribe to ensure keys are fresh
        await subscription.unsubscribe();
      }
      
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });

      updateDebug({ pushSubscription: true });

      // Save to backend - clean up old subscriptions for this user first
      if (user) {
        const subJson = subscription.toJSON();
        
        // Delete all old subscriptions for this user (different endpoints)
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id);
        
        // Insert the fresh subscription
        const { error } = await supabase.from("push_subscriptions").insert({
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        });

        if (error) {
          throw new Error(`Subscription speichern fehlgeschlagen: ${error.message}`);
        }
        
        console.log("[Push] Fresh subscription saved for user", user.id);
      }

      updateDebug({ loading: false });
      return true;
    } catch (err: any) {
      updateDebug({
        lastError: err?.message || String(err),
        loading: false,
      });
      return false;
    }
  }, [user, updateDebug]);

  // Send test push
  const sendTestPush = useCallback(async () => {
    if (!user) return false;
    updateDebug({ lastPushSuccess: null, lastError: null });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Keine aktive Session");
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            title: "🔔 Clevara Test",
            body: "Push-Benachrichtigungen funktionieren!",
          }),
        }
      );

      const data = await res.json();
      console.log("[Push] Test push result:", JSON.stringify(data));
      const success = data.sent > 0;
      updateDebug({ lastPushSuccess: success, lastError: success ? null : JSON.stringify(data) });
      return success;
    } catch (err: any) {
      updateDebug({
        lastPushSuccess: false,
        lastError: err?.message || String(err),
      });
      return false;
    }
  }, [user, updateDebug]);

  return { debug, subscribe, sendTestPush };
};
