import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Initializes Capacitor native push notifications (FCM on Android).
 * Falls back silently on web — web push is handled by usePushSubscription.
 */
export const useNativePush = () => {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  const register = useCallback(async () => {
    if (!user || registeredRef.current) return;

    try {
      const w = window as any;
      if (!w.Capacitor?.getPlatform || w.Capacitor.getPlatform() === "web") return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") {
        console.log("[NativePush] Permission denied");
        return;
      }

      // Register with FCM
      await PushNotifications.register();

      // Listen for FCM token
      PushNotifications.addListener("registration", async (token) => {
        console.log("[NativePush] FCM token received:", token.value.substring(0, 20) + "...");

        // Store FCM token in push_subscriptions with a special endpoint format
        const endpoint = `fcm://${token.value}`;

        await supabase
          .from("push_subscriptions")
          .upsert(
            {
              user_id: user.id,
              endpoint,
              p256dh: "fcm",
              auth: "fcm",
            },
            { onConflict: "user_id,endpoint" }
          );

        registeredRef.current = true;
      });

      // Handle registration errors
      PushNotifications.addListener("registrationError", (error) => {
        console.error("[NativePush] Registration error:", error);
      });

      // Handle incoming notifications when app is in foreground
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[NativePush] Received in foreground:", notification);
      });

      // Handle notification tap
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("[NativePush] Notification tapped:", action);
        const data = action.notification.data;
        if (data?.conversation_id) {
          window.location.href = `/chat/${data.conversation_id}`;
        } else if (data?.type === "incoming_call" && data?.call_id) {
          window.location.href = `/call/${data.call_id}`;
        }
      });
    } catch (error) {
      console.log("[NativePush] Not available (web context):", error);
    }
  }, [user]);

  useEffect(() => {
    register();
  }, [register]);
};
