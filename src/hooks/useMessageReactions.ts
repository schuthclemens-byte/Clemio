import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

export { EMOJIS };

export interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export const useMessageReactions = (messageIds: string[]) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});

  const loadReactions = async () => {
    if (!messageIds.length) return;

    const { data } = await supabase
      .from("message_reactions" as any)
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);

    if (!data) return;

    const grouped: Record<string, Reaction[]> = {};
    for (const row of data as any[]) {
      if (!grouped[row.message_id]) grouped[row.message_id] = [];
      const existing = grouped[row.message_id].find((r) => r.emoji === row.emoji);
      if (existing) {
        existing.count++;
        if (row.user_id === user?.id) existing.hasReacted = true;
      } else {
        grouped[row.message_id].push({
          emoji: row.emoji,
          count: 1,
          hasReacted: row.user_id === user?.id,
        });
      }
    }
    setReactions(grouped);
  };

  useEffect(() => {
    loadReactions();
  }, [messageIds.join(",")]);

  // Subscribe to realtime
  useEffect(() => {
    if (!messageIds.length) return;

    const channel = supabase
      .channel("reactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => loadReactions()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageIds.join(",")]);

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const existing = reactions[messageId]?.find(
      (r) => r.emoji === emoji && r.hasReacted
    );

    if (existing) {
      await supabase
        .from("message_reactions" as any)
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("message_reactions" as any).insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }
  };

  return { reactions, toggleReaction };
};
