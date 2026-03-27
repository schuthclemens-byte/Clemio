import { useEffect, useRef, useCallback } from "react";
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
  const { subscribe, debug, refreshStatus } = usePushSubscription();
  const { canUsePush } = usePushCapability();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user) {
      attempted.current = false;
      return;
    }
    if (attempted.current) return;
    if (debug.loading) return;
    if (!canUsePush) return;

    // If everything is healthy, do nothing
    if (debug.pushSubscription && debug.backendEndpointMatches === true && !debug.subscriptionNeedsRefresh) {
      return;
    }

    // Only auto-re-subscribe if permission was ALREADY granted
    if (debug.notificationPermission !== "granted") return;

    attempted.current = true;
    const timer = setTimeout(() => {
      subscribe();
    }, 2000);

    return () => clearTimeout(timer);
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
