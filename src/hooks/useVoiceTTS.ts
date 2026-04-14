import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedAudio, setCachedAudio } from "@/lib/ttsCache";

/**
 * Check if MediaSource supports MP3 streaming (not available in Safari).
 */
const canStreamMp3 = (() => {
  try {
    return (
      typeof MediaSource !== "undefined" &&
      MediaSource.isTypeSupported("audio/mpeg")
    );
  } catch {
    return false;
  }
})();

export const useVoiceTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      // Revoke object URL if it was a streaming blob
      const src = audioRef.current.src;
      if (src.startsWith("blob:")) {
        // Don't revoke cached URLs – they're managed by ttsCache
      }
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setPlayingMsgId(null);
  }, []);

  /** Build the fetch request for TTS */
  const buildTtsRequest = useCallback(async (text: string, senderId: string, signal?: AbortSignal) => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error("Not authenticated");

    return fetch(
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
  }, []);

  /** Fetch TTS blob (used for preloading and fallback playback) */
  const fetchTtsBlob = useCallback(async (text: string, senderId: string, signal?: AbortSignal): Promise<Blob> => {
    const response = await buildTtsRequest(text, senderId, signal);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "TTS fehlgeschlagen");
    }

    return response.blob();
  }, [buildTtsRequest]);

  /** Play using MediaSource streaming – audio starts as soon as first chunks arrive */
  const playStreaming = useCallback(async (
    text: string,
    senderId: string,
    signal: AbortSignal,
    onEnd: () => void
  ) => {
    const response = await buildTtsRequest(text, senderId, signal);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "TTS fehlgeschlagen");
    }

    const mediaSource = new MediaSource();
    const audio = new Audio();
    audio.src = URL.createObjectURL(mediaSource);
    audioRef.current = audio;

    await new Promise<void>((resolve, reject) => {
      mediaSource.addEventListener("sourceopen", async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
          const reader = response.body!.getReader();
          const chunks: Uint8Array[] = [];
          let started = false;

          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (signal.aborted) {
                reader.cancel();
                return;
              }

              if (done) {
                // Wait for sourceBuffer to finish updating before ending
                if (sourceBuffer.updating) {
                  await new Promise<void>(r => sourceBuffer.addEventListener("updateend", () => r(), { once: true }));
                }
                if (mediaSource.readyState === "open") {
                  mediaSource.endOfStream();
                }
                break;
              }

              chunks.push(value);

              // Append chunk – wait if buffer is busy
              if (sourceBuffer.updating) {
                await new Promise<void>(r => sourceBuffer.addEventListener("updateend", () => r(), { once: true }));
              }
              sourceBuffer.appendBuffer(value);

              // Start playback after first chunk
              if (!started) {
                started = true;
                setIsLoading(false);
                setIsPlaying(true);
                audio.play().catch(() => {});
              }
            }
          };

          await pump();

          // Cache the full blob for future instant playback
          const fullBlob = new Blob(chunks, { type: "audio/mpeg" });
          setCachedAudio(senderId, text, fullBlob);

          resolve();
        } catch (e) {
          reject(e);
        }
      }, { once: true });
    });

    audio.onended = onEnd;
    audio.onerror = onEnd;
  }, [buildTtsRequest]);

  /** Play with blob fallback (Safari or when MediaSource unavailable) */
  const playBlobFallback = useCallback(async (
    text: string,
    senderId: string,
    signal: AbortSignal,
    onEnd: () => void
  ) => {
    const audioBlob = await fetchTtsBlob(text, senderId, signal);
    const audioUrl = setCachedAudio(senderId, text, audioBlob);

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = onEnd;
    audio.onerror = onEnd;

    setIsLoading(false);
    setIsPlaying(true);
    await audio.play();
  }, [fetchTtsBlob]);

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

    const onEnd = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setPlayingMsgId(null);
    };

    try {
      // Check cache first – instant playback
      const cachedUrl = getCachedAudio(senderId, text);
      if (cachedUrl) {
        const audio = new Audio(cachedUrl);
        audioRef.current = audio;
        audio.onended = onEnd;
        audio.onerror = onEnd;
        setIsLoading(false);
        setIsPlaying(true);
        await audio.play();
        return;
      }

      // Stream if supported, otherwise blob fallback
      if (canStreamMp3) {
        await playStreaming(text, senderId, controller.signal, onEnd);
      } else {
        await playBlobFallback(text, senderId, controller.signal, onEnd);
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Voice TTS error:", error);
      onEnd();
    }
  }, [playingMsgId, isPlaying, isLoading, stop, playStreaming, playBlobFallback]);

  return { playClonedVoice, isPlaying, isLoading, playingMsgId, stop, fetchTtsBlob };
};
