import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, Loader2, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onSend: (file: File) => Promise<boolean | void> | boolean | void;
  autoStart?: boolean;
}

const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/ogg;codecs=opus",
];

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  return AUDIO_MIME_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || "";
};

const getAudioExtension = (mimeType: string) => {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
};

const VoiceRecorder = ({ onSend, autoStart }: VoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sending, setSending] = useState(false);
  const autoStartedRef = useRef(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {}
  };

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicBlocked(false);
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        releaseWakeLock();
        if (timerRef.current) clearInterval(timerRef.current);

        const actualMimeType = recorder.mimeType || chunksRef.current[0]?.type || mimeType || "audio/webm";
        const extension = getAudioExtension(actualMimeType);
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: actualMimeType });

        setSending(true);
        try {
          const result = await onSend(file);
          if (result !== false) {
            setSeconds(0);
          }
        } finally {
          setSending(false);
        }
      };

      recorder.start();
      await requestWakeLock();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicBlocked(true);
        toast.error("Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in deinen Geräteeinstellungen.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error("Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an.");
      } else {
        toast.error("Mikrofon konnte nicht aktiviert werden.");
      }
    }
  };

  // Auto-start recording when autoStart prop is true
  useEffect(() => {
    if (autoStart && !autoStartedRef.current && !recording) {
      autoStartedRef.current = true;
      startRecording();
    }
  }, [autoStart]);

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

  if (micBlocked) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-destructive/5 rounded-2xl border border-destructive/20 animate-fade-in">
        <MicOff className="w-5 h-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Mikrofon blockiert</p>
          <p className="text-xs text-muted-foreground">Erlaube den Zugriff in deinen Browser- oder Geräteeinstellungen und versuche es erneut.</p>
        </div>
        <button
          onClick={() => { setMicBlocked(false); startRecording(); }}
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground active:scale-95 transition-transform"
        >
          Erneut
        </button>
      </div>
    );
  }

  if (sending) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-2xl">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Sprachnachricht wird gesendet...</span>
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
