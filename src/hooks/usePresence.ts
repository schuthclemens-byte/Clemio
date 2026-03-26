import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";

/**
 * Global presence hook using Supabase Realtime Presence (WebSocket).
 *
 * - Live online status via Realtime Presence channel (no DB writes for heartbeats)
 * - DB `user_presence` table updated only on status *change* and every 60s
 *   so "last seen" persists for offline users.
 */

const PRESENCE_CHANNEL = "global-presence";
const DB_SYNC_INTERVAL = 60_000; // write last_seen to DB every 60s

export const usePresence = () => {
  const { user, loading } = useAuth();
  const { showOnlineStatus } = useAccessibility();
  const dbSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const wasOnlineRef = useRef<boolean | null>(null);

  const writePresenceToDb = useCallback(
    async (online: boolean) => {
      if (!user) return;
      const effectiveOnline = showOnlineStatus ? online : false;
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        is_online: effectiveOnline,
        last_seen: new Date().toISOString(),
      });
    },
    [user, showOnlineStatus]
  );

  useEffect(() => {
    if (loading || !user) return;

    const isActive = () => document.visibilityState === "visible" && document.hasFocus();

    // --- Realtime Presence channel ---
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    const trackStatus = (online: boolean) => {
      const effectiveOnline = showOnlineStatus ? online : false;
      channel.track({
        user_id: user.id,
        is_online: effectiveOnline,
        last_active: new Date().toISOString(),
      });

      // Write to DB only on status *change*
      if (wasOnlineRef.current !== effectiveOnline) {
        wasOnlineRef.current = effectiveOnline;
        void writePresenceToDb(effectiveOnline);
      }
    };

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        trackStatus(isActive());
      }
    });

    // --- Visibility / focus handlers ---
    const syncPresence = () => trackStatus(isActive());

    document.addEventListener("visibilitychange", syncPresence);
    window.addEventListener("focus", syncPresence);
    window.addEventListener("blur", syncPresence);

    const handleBeforeUnload = () => {
      // Best-effort DB write on close
      void writePresenceToDb(false);
      channel.untrack();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // --- Periodic DB sync for last_seen (every 60s while active) ---
    dbSyncRef.current = setInterval(() => {
      if (isActive()) void writePresenceToDb(true);
    }, DB_SYNC_INTERVAL);

    return () => {
      if (dbSyncRef.current) clearInterval(dbSyncRef.current);
      document.removeEventListener("visibilitychange", syncPresence);
      window.removeEventListener("focus", syncPresence);
      window.removeEventListener("blur", syncPresence);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      channel.untrack();
      supabase.removeChannel(channel);
      void writePresenceToDb(false);
    };
  }, [user, showOnlineStatus, loading, writePresenceToDb]);
};
