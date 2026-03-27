import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePushSubscription } from "@/hooks/usePushSubscription";

/**
 * Automatically subscribes the user to push notifications after login.
 * Silently skips if permission was denied or browser doesn't support it.
 */
export const useAutoPush = () => {
  const { user } = useAuth();
  const { subscribe, debug } = usePushSubscription();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user) {
      attempted.current = false;
      return;
    }
    if (attempted.current) return;
    if (debug.loading) return;

    // Don't prompt if already subscribed or permission denied
    if (debug.pushSubscription) return;
    if (debug.notificationPermission === "denied") return;
    if (debug.notificationPermission === "unsupported") return;

    attempted.current = true;
    // Small delay so the app feels loaded before the browser prompt appears
    const timer = setTimeout(() => {
      subscribe();
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, debug.loading, debug.pushSubscription, debug.notificationPermission, subscribe]);
};
