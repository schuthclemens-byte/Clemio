import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { usePushCapability } from "@/hooks/usePushCapability";

/**
 * Re-subscribes push if the user already granted permission previously
 * but the subscription is missing (e.g. after clearing browser data).
 * Does NOT trigger the browser permission dialog on its own –
 * the PushPromptSheet handles the initial permission request.
 */
export const useAutoPush = () => {
  const { user } = useAuth();
  const { subscribe, debug } = usePushSubscription();
  const { canUsePush } = usePushCapability();
  const attempted = useRef(false);
  const retryCount = useRef(0);

  useEffect(() => {
    if (!user) {
      attempted.current = false;
      retryCount.current = 0;
      return;
    }
    if (attempted.current) return;
    if (debug.loading) return;
    if (!canUsePush) return;
    if (!debug.subscriptionNeedsRefresh && debug.pushSubscription && debug.backendEndpointMatches !== false) {
      attempted.current = false;
      retryCount.current = 0;
      return;
    }

    // Only auto-re-subscribe if permission was ALREADY granted
    // and the subscription is missing, stale or not synced to backend.
    if (debug.notificationPermission !== "granted") return;
    if (retryCount.current >= 3) return;

    attempted.current = true;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const success = await subscribe();
      if (cancelled) return;

      if (success) {
        retryCount.current = 0;
        return;
      }

      attempted.current = false;
      retryCount.current += 1;
      window.setTimeout(() => {
        attempted.current = false;
      }, 1500);
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    user,
    debug.loading,
    debug.pushSubscription,
    debug.notificationPermission,
    debug.subscriptionNeedsRefresh,
    debug.backendEndpointMatches,
    subscribe,
    canUsePush,
  ]);
};
