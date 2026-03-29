import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useNotifications = () => {
  const { user } = useAuth();

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const showNotification = useCallback((title: string, body: string, conversationId?: string) => {
    if (Notification.permission !== "granted") return;
    if (document.hasFocus()) return; // Don't show if app is focused

    const options: NotificationOptions & { renotify?: boolean } = {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: conversationId || "clemio-message",
    };

    const notification = new Notification(title, options);

    notification.onclick = () => {
      window.focus();
      if (conversationId) {
        window.location.href = `/chat/${conversationId}`;
      }
      notification.close();
    };
  }, []);

  // Listen for new messages globally
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const msg = payload.new as any;

          // Skip own messages
          if (msg.sender_id === user.id) return;

          // Get sender name
          const profile = await fetchAccessibleProfile(msg.sender_id);
          const senderName = profile?.display_name || "Neue Nachricht";

          showNotification(senderName, msg.content, msg.conversation_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showNotification]);

  return { requestPermission };
};
