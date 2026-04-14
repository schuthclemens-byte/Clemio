import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedAudio, setCachedAudio } from "@/lib/ttsCache";

export const useVoiceTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setIsLoading(false);
    setPlayingMsgId(null);
  }, []);

  /** Fetch TTS blob (used for both playback and preloading) */
  const fetchTtsBlob = useCallback(async (text: string, senderId: string, signal?: AbortSignal): Promise<Blob> => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error("Not authenticated");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-tts-stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          text,
          senderId,
          lang: "de",
          defaultVoiceId: localStorage.getItem("clemio_default_voice") || "onwK4e9ZLuTAKqWW03F9",
        }),
        signal,
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "TTS fehlgeschlagen");
    }

    return response.blob();
  }, []);

  const playClonedVoice = useCallback(async (text: string, senderId: string, msgId: string, lang?: string) => {
    // Toggle off
    if (playingMsgId === msgId && (isPlaying || isLoading)) {
      stop();
      return;
    }

    stop();
    setIsLoading(true);
    setPlayingMsgId(msgId);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Check cache first
      let audioUrl = getCachedAudio(senderId, text);

      if (!audioUrl) {
        const audioBlob = await fetchTtsBlob(text, senderId, controller.signal);
        audioUrl = setCachedAudio(senderId, text, audioBlob);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);
        setPlayingMsgId(null);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        setPlayingMsgId(null);
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
  }, [playingMsgId, isPlaying, isLoading, stop, fetchTtsBlob]);

  return { playClonedVoice, isPlaying, isLoading, playingMsgId, stop, fetchTtsBlob };
};
