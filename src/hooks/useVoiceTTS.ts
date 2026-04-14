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
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setPlayingMsgId(null);
  }, []);

  /** Download audio directly from storage (no edge function call) */
  const playFromStorage = useCallback(async (
    cacheKey: string,
    senderId: string,
    text: string,
    onEnd: () => void
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.storage
        .from("tts-cache")
        .download(cacheKey);

      if (error || !data) return false;

      const audioUrl = setCachedAudio(senderId, text, data);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = onEnd;
      audio.onerror = onEnd;
      setIsLoading(false);
      setIsPlaying(true);
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Build the fetch request for TTS */
  const buildTtsRequest = useCallback(async (text: string, senderId: string, msgId: string, signal?: AbortSignal) => {
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
          messageId: msgId,
          lang: "de",
          defaultVoiceId: localStorage.getItem("clemio_default_voice") || "onwK4e9ZLuTAKqWW03F9",
        }),
        signal,
      }
    );
  }, []);

  /** Fetch TTS blob (used for preloading and fallback playback) */
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

  /** Play using MediaSource streaming – audio starts as soon as first chunks arrive */
  const playStreaming = useCallback(async (
    text: string,
    senderId: string,
    msgId: string,
    signal: AbortSignal,
    onEnd: () => void
  ) => {
    const response = await buildTtsRequest(text, senderId, msgId, signal);

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
                if (sourceBuffer.updating) {
                  await new Promise<void>(r => sourceBuffer.addEventListener("updateend", () => r(), { once: true }));
                }
                if (mediaSource.readyState === "open") {
                  mediaSource.endOfStream();
                }
                break;
              }

              chunks.push(value);

              if (sourceBuffer.updating) {
                await new Promise<void>(r => sourceBuffer.addEventListener("updateend", () => r(), { once: true }));
              }
              sourceBuffer.appendBuffer(value);

              if (!started) {
                started = true;
                setIsLoading(false);
                setIsPlaying(true);
                audio.play().catch(() => {});
              }
            }
          };

          await pump();

          const fullBlob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
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
    msgId: string,
    signal: AbortSignal,
    onEnd: () => void
  ) => {
    const response = await buildTtsRequest(text, senderId, msgId, signal);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "TTS fehlgeschlagen");
    }

    const audioBlob = await response.blob();
    const audioUrl = setCachedAudio(senderId, text, audioBlob);

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = onEnd;
    audio.onerror = onEnd;

    setIsLoading(false);
    setIsPlaying(true);
    await audio.play();
  }, [buildTtsRequest]);

  const playClonedVoice = useCallback(async (text: string, senderId: string, msgId: string, lang?: string, audioUrl?: string) => {
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

    // Pre-create utterance synchronously within gesture context for mobile compatibility
    const langMap: Record<string, string> = {
      de: "de-DE", en: "en-US", fr: "fr-FR", es: "es-ES", tr: "tr-TR", ar: "ar-SA",
    };
    const fallbackUtterance = new SpeechSynthesisUtterance(text);
    fallbackUtterance.lang = langMap[lang || "de"] || "de-DE";
    fallbackUtterance.rate = 1.0;

    const onEnd = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setPlayingMsgId(null);
    };

    try {
      // 1. Check in-memory LRU cache first – instant playback
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

      // 2. If audio_url exists on message, download directly from storage (NO edge function call)
      if (audioUrl) {
        const success = await playFromStorage(audioUrl, senderId, text, onEnd);
        if (success) return;
        // If storage download fails, fall through to edge function
      }

      // 3. Call edge function (generates via ElevenLabs if needed, caches, and sets audio_url)
      if (canStreamMp3) {
        await playStreaming(text, senderId, msgId, controller.signal, onEnd);
      } else {
        await playBlobFallback(text, senderId, msgId, controller.signal, onEnd);
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Voice TTS error, falling back to browser TTS:", error);

      // Fallback: use free browser speech synthesis
      try {
        fallbackUtterance.onend = onEnd;
        fallbackUtterance.onerror = onEnd;
        setIsLoading(false);
        setIsPlaying(true);
        window.speechSynthesis.speak(fallbackUtterance);
      } catch (fallbackError) {
        console.error("Browser TTS fallback also failed:", fallbackError);
        const { toast } = await import("sonner");
        toast.error("Sprachausgabe fehlgeschlagen", {
          description: "Bitte versuche es später erneut.",
        });
        onEnd();
      }
    }
  }, [playingMsgId, isPlaying, isLoading, stop, playFromStorage, playStreaming, playBlobFallback]);

  return { playClonedVoice, isPlaying, isLoading, playingMsgId, stop, fetchTtsBlob };
};
