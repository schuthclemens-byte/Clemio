import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useTypingIndicator = (conversationId: string | undefined) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  // Send typing status
  const sendTyping = async () => {
    if (!user || !conversationId) return;
    await supabase.from("typing_indicators" as any).upsert({
      user_id: user.id,
      conversation_id: conversationId,
      updated_at: new Date().toISOString(),
    });
  };

  const clearTyping = async () => {
    if (!user) return;
    await supabase.from("typing_indicators" as any).delete().eq("user_id", user.id);
  };

  // Subscribe to typing changes
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as any;
            if (old?.user_id) {
              setTypingUsers((prev) => {
                const next = { ...prev };
                delete next[old.user_id];
                return next;
              });
            }
          } else {
            const record = payload.new as any;
            if (record.user_id === user.id) return;
            
            // Fetch name
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", record.user_id)
              .maybeSingle();

            setTypingUsers((prev) => ({
              ...prev,
              [record.user_id]: profile?.display_name || "Jemand",
            }));

            // Auto-clear after 5s
            setTimeout(() => {
              setTypingUsers((prev) => {
                const next = { ...prev };
                delete next[record.user_id];
                return next;
              });
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      clearTyping();
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const typingNames = Object.values(typingUsers);

  return { sendTyping, clearTyping, typingNames };
};
