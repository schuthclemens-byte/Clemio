import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useVoiceTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playClonedVoice = async (text: string, senderId: string, msgId: string) => {
    // Stop if already playing this message
    if (playingMsgId === msgId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setPlayingMsgId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsPlaying(true);
    setPlayingMsgId(msgId);

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
          body: JSON.stringify({ text, senderId }),
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
        setPlayingMsgId(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setPlayingMsgId(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error("Voice TTS error:", error);
      setIsPlaying(false);
      setPlayingMsgId(null);
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setPlayingMsgId(null);
  };

  return { playClonedVoice, isPlaying, playingMsgId, stop };
};
