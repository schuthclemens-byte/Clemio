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
  const { user, loading } = useAuth();
  const { showOnlineStatus } = useAccessibility();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading || !user) return;

    const setPresence = async (online: boolean) => {
      const effectiveOnline = showOnlineStatus ? online : false;
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        is_online: effectiveOnline,
        last_seen: new Date().toISOString(),
      });
    };

    const isActive = () => document.visibilityState === "visible" && document.hasFocus();
    const syncPresence = () => {
      void setPresence(isActive());
    };

    void setPresence(isActive());

    heartbeatRef.current = setInterval(() => {
      if (isActive()) void setPresence(true);
    }, 2_000);

    const handleBeforeUnload = () => {
      void setPresence(false);
    };

    document.addEventListener("visibilitychange", syncPresence);
    window.addEventListener("focus", syncPresence);
    window.addEventListener("blur", syncPresence);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener("visibilitychange", syncPresence);
      window.removeEventListener("focus", syncPresence);
      window.removeEventListener("blur", syncPresence);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void setPresence(false);
    };
  }, [user, showOnlineStatus, loading]);
};
