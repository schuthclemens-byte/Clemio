import { useState, useRef } from "react";
import { Mic, Square, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onSend: (file: File) => void;
}

const VoiceRecorder = ({ onSend }: VoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sending, setSending] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setSending(true);
        onSend(file);
        setSending(false);
        setSeconds(0);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      // Microphone not available
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (sending) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-2xl">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Wird gesendet...</span>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-destructive/5 rounded-2xl border border-destructive/20 animate-fade-in">
        <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-medium tabular-nums flex-1">{formatTime(seconds)}</span>
        <button
          onClick={stopRecording}
          className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground active:scale-90 transition-transform"
          aria-label="Aufnahme stoppen"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="flex items-center justify-center w-11 h-11 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors active:scale-90"
      aria-label="Sprachnachricht aufnehmen"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
};

export default VoiceRecorder;
