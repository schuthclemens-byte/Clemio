import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QueuedMessage {
  tempId: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  replyTo?: string;
  queuedAt: number;
}

const STORAGE_KEY = "clevara_offline_queue";

const getQueue = (): QueuedMessage[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const setQueue = (queue: QueuedMessage[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const useOfflineQueue = (onSent?: (tempId: string, realId: string) => void) => {
  const flushingRef = useRef(false);

  const enqueue = useCallback((msg: QueuedMessage) => {
    const queue = getQueue();
    queue.push(msg);
    setQueue(queue);
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    flushingRef.current = true;

    const remaining: QueuedMessage[] = [];

    for (const msg of queue) {
      try {
        const insertData: any = {
          conversation_id: msg.conversationId,
          sender_id: msg.senderId,
          content: msg.content,
          message_type: msg.messageType,
        };
        if (msg.replyTo) insertData.reply_to = msg.replyTo;

        const { data, error } = await supabase
          .from("messages")
          .insert(insertData)
          .select("id")
          .single();

        if (error) {
          remaining.push(msg);
        } else if (data) {
          onSent?.(msg.tempId, data.id);
          // Update conversation timestamp
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", msg.conversationId);
        }
      } catch {
        remaining.push(msg);
      }
    }

    setQueue(remaining);
    flushingRef.current = false;
  }, [onSent]);

  // Flush when coming back online
  useEffect(() => {
    const handleOnline = () => flush();
    window.addEventListener("online", handleOnline);

    // Also try flushing on mount if online
    if (navigator.onLine) flush();

    return () => window.removeEventListener("online", handleOnline);
  }, [flush]);

  return { enqueue, flush, queueSize: getQueue().length };
};