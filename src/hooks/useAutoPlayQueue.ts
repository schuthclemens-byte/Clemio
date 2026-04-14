import { useState, useRef, useCallback, useEffect } from "react";
import { playStartListenPop } from "@/lib/sounds";
import { preloadAudio } from "@/lib/ttsCache";

interface QueueItem {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
}

interface UseAutoPlayQueueOptions {
  speak: (text: string, lang?: string) => void;
  isSpeaking: boolean;
  lang: string;
  enabled: boolean;
  /** Optional: fetch function for preloading next items */
  fetchTtsBlob?: (text: string, senderId: string) => Promise<Blob>;
}

/**
 * Manages a sequential auto-play queue for incoming messages.
 * Messages are played one after another with a gentle pause between them.
 */
export const useAutoPlayQueue = ({ speak, isSpeaking, lang, enabled, fetchTtsBlob }: UseAutoPlayQueueOptions) => {
  const queueRef = useRef<QueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<QueueItem | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const isProcessingRef = useRef(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setCurrentItem(null);
      setQueueLength(0);
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = true;
    const next = queueRef.current.shift()!;
    setCurrentItem(next);
    setQueueLength(queueRef.current.length);

    // Small pop sound before speaking
    playStartListenPop();

    // Brief pause before starting speech for a smooth transition
    pauseTimerRef.current = setTimeout(() => {
      speak(next.text, lang);

      // Preload next item in queue while current plays
      if (fetchTtsBlob && queueRef.current.length > 0) {
        const peek = queueRef.current[0];
        preloadAudio(peek.senderId, peek.text, () => fetchTtsBlob(peek.text, peek.senderId));
      }
    }, 400);
  }, [speak, lang, fetchTtsBlob]);

  // Watch for speech ending to play the next item
  useEffect(() => {
    if (!isProcessingRef.current) return;
    if (currentItem && !isSpeaking) {
      // Speech just finished – wait a beat then play next
      const t = setTimeout(() => processNext(), 800);
      return () => clearTimeout(t);
    }
  }, [isSpeaking, currentItem, processNext]);

  const enqueue = useCallback((item: QueueItem) => {
    if (!enabled) return;
    queueRef.current.push(item);
    setQueueLength(queueRef.current.length);

    // If not currently processing, start
    if (!isProcessingRef.current) {
      processNext();
    }
  }, [enabled, processNext]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setCurrentItem(null);
    setQueueLength(0);
    isProcessingRef.current = false;
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  return {
    enqueue,
    clearQueue,
    currentItem,
    queueLength,
    isAutoPlaying: isProcessingRef.current && !!currentItem,
  };
};
