import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useVoiceTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    // Abort any in-flight fetch
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setIsLoading(false);
    setPlayingMsgId(null);
  }, []);

  const playClonedVoice = useCallback(async (text: string, senderId: string, msgId: string, lang?: string) => {
    // Toggle off if already playing/loading this message
    if (playingMsgId === msgId && (isPlaying || isLoading)) {
      stop();
      return;
    }

    // Stop any current playback
    stop();

    setIsLoading(true);
    setPlayingMsgId(msgId);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ text, senderId, lang: lang || "de" }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "TTS fehlgeschlagen");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);
        setPlayingMsgId(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        setPlayingMsgId(null);
        URL.revokeObjectURL(audioUrl);
      };

      setIsLoading(false);
      setIsPlaying(true);
      await audio.play();
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Voice TTS error:", error);
      setIsPlaying(false);
      setIsLoading(false);
      setPlayingMsgId(null);
    }
  }, [playingMsgId, isPlaying, isLoading, stop]);

  return { playClonedVoice, isPlaying, isLoading, playingMsgId, stop };
};
