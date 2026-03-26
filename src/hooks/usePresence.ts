import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";

/**
 * Global presence hook – sets the user online only when the tab/app is actively visible.
 * Heartbeat every 30s keeps the status fresh; visibility change and beforeunload
 * immediately toggle it off.
 */
export const usePresence = () => {
  const { user } = useAuth();
  const { showOnlineStatus } = useAccessibility();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const setPresence = async (online: boolean) => {
      const effectiveOnline = showOnlineStatus ? online : false;
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        is_online: effectiveOnline,
        last_seen: new Date().toISOString(),
      });
    };

    const isVisible = () => document.visibilityState === "visible";

    // Initial
    setPresence(isVisible());

    // Heartbeat – re-affirm "online" every 30s while visible
    heartbeatRef.current = setInterval(() => {
      if (isVisible()) setPresence(true);
    }, 30_000);

    const handleVisibilityChange = () => {
      setPresence(isVisible());
    };

    const handleBeforeUnload = () => setPresence(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setPresence(false);
    };
  }, [user, showOnlineStatus]);
};
