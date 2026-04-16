import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, RotateCcw, Play, Pause, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GOAL_SECONDS = 45;
const MIN_SECONDS = 20;
const GOOD_MIN = 30;
const GOOD_MAX = 60;

const EXAMPLE_TEXTS_DE = [
  "Hallo, ich teste gerade meine Stimme für diese App. Ich möchte, dass sie natürlich und klar klingt, damit andere mich gut verstehen können.",
  "Ich möchte, dass meine Stimme natürlich klingt. Deshalb spreche ich jetzt einen kleinen Text ein, um mein Stimmprofil zu erstellen.",
  "Das ist ein Beispiel, damit andere mich später hören können. Ich erzähle einfach ein bisschen, wie mein Tag heute war und was ich vorhabe.",
  "Guten Tag! Ich erstelle gerade mein Stimmprofil. Ich spreche ruhig und deutlich, damit die Aufnahme möglichst gut wird.",
  "Ich freue mich, diese App zu nutzen. Mit meiner Stimme können andere meine Nachrichten so hören, wie ich sie spreche.",
];

const EXAMPLE_TEXTS_EN = [
  "Hello, I'm testing my voice for this app right now. I want it to sound natural and clear so others can understand me well.",
  "I want my voice to sound natural. That's why I'm recording a short text now to create my voice profile.",
  "This is an example so others can hear me later. I'll just talk a bit about how my day has been and what I have planned.",
  "Good day! I'm creating my voice profile right now. I'm speaking calmly and clearly so the recording turns out well.",
  "I'm excited to use this app. With my voice, others can hear my messages the way I actually speak them.",
];

interface InlineVoiceRecorderProps {
  onVoiceSaved: (path: string) => void;
  userName?: string;
}

const InlineVoiceRecorder = ({ onVoiceSaved, userName }: InlineVoiceRecorderProps) => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const isDE = locale === "de";

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [exampleText] = useState(() => {
    const texts = isDE ? EXAMPLE_TEXTS_DE : EXAMPLE_TEXTS_EN;
    return texts[Math.floor(Math.random() * texts.length)];
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          toast.error(isDE ? "Aufnahme leer" : "Recording empty");
          setIsRecording(false);
          return;
        }

        setIsRecording(false);
        setUploading(true);

        try {
          const filePath = `${user.id}/${user.id}.wav`;
          const { error: uploadErr } = await supabase.storage
            .from("stimmen")
            .upload(filePath, blob, { upsert: true, contentType: "audio/wav" });
          if (uploadErr) throw uploadErr;

          const { error: dbErr } = await supabase
            .from("profiles")
            .update({ voice_path: filePath } as any)
            .eq("id", user.id);
          if (dbErr) throw dbErr;

          toast.success(isDE ? "Stimme gespeichert ✓" : "Voice saved ✓");
          onVoiceSaved(filePath);
        } catch (err: any) {
          console.error("Voice upload error:", err);
          toast.error(
            `${isDE ? "Upload fehlgeschlagen" : "Upload failed"}: ${err?.message || "Unknown"}`
          );
        }
        setUploading(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setElapsed(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);
    } catch {
      toast.error(isDE ? "Mikrofon-Zugriff verweigert" : "Microphone access denied");
    }
  }, [user, isDE, onVoiceSaved]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const progress = Math.min(elapsed / GOAL_SECONDS, 1);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);
  const isInGoodZone = elapsed >= GOOD_MIN && elapsed <= GOOD_MAX;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const ringColor = () => {
    if (isInGoodZone) return "hsl(var(--success))";
    if (elapsed > GOOD_MAX) return "hsl(var(--accent))";
    return "hsl(var(--primary))";
  };

  return (
    <div className="space-y-4">
      {/* Intro text when not recording */}
      {!isRecording && !uploading && (
        <div className="bg-card/60 backdrop-blur rounded-2xl p-4 border border-border/50 text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-soft mb-3">
            <Mic className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="font-semibold text-[0.938rem]">
            {isDE ? "Erstelle deine Stimme" : "Create your voice"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isDE
              ? "Sprich 30–45 Sekunden ganz natürlich. Normale Alltagsgeräusche sind okay."
              : "Speak naturally for 30–45 seconds. Normal everyday sounds are fine."}
          </p>
          <p className="text-[0.625rem] text-muted-foreground/70 leading-relaxed">
            {isDE
              ? "Je natürlicher du sprichst, desto besser klingt deine Stimme."
              : "The more naturally you speak, the better your voice will sound."}
          </p>
        </div>
      )}

      {/* Progress ring & timer during recording */}
      {(isRecording || uploading) && (
        <div className="flex flex-col items-center space-y-3">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={ringColor()}
                strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 ease-linear"
                style={{ filter: isInGoodZone ? `drop-shadow(0 0 8px ${ringColor()})` : undefined }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">{formatTime(elapsed)}</span>
              {isRecording && (
                <span className="text-[0.625rem] text-muted-foreground mt-0.5">
                  {isDE ? "Aufnahme läuft" : "Recording"}
                </span>
              )}
            </div>
            {isRecording && (
              <div
                className="absolute inset-0 rounded-full animate-pulse pointer-events-none"
                style={{ boxShadow: `0 0 20px 6px hsl(var(--primary) / 0.12)` }}
              />
            )}
          </div>

          {/* Status hints */}
          {isRecording && elapsed < GOOD_MIN && (
            <p className="text-xs text-muted-foreground text-center">
              {isDE ? "Sprich bitte mindestens 30 Sekunden." : "Please speak at least 30 seconds."}
            </p>
          )}
          {isRecording && isInGoodZone && (
            <p className="text-xs text-[hsl(var(--success))] font-medium text-center">
              {isDE ? "Perfekt! Optimaler Bereich." : "Perfect! Optimal range."}
            </p>
          )}
          {isRecording && elapsed > GOOD_MAX && (
            <p className="text-xs text-muted-foreground text-center">
              {isDE ? "Super – du kannst jetzt stoppen." : "Great – you can stop now."}
            </p>
          )}
        </div>
      )}

      {/* Example text */}
      {isRecording && (
        <div className="bg-card/60 backdrop-blur rounded-2xl p-3 border border-border/50 text-left">
          <p className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {isDE ? "Beispieltext zum Vorlesen" : "Example text to read"}
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed italic">„{exampleText}"</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="w-full h-11 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-soft hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Square className="w-4 h-4 fill-current" />
            {isDE ? "Stoppen" : "Stop"}
          </button>
        ) : uploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-3">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm">{isDE ? "Wird gespeichert…" : "Saving…"}</span>
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm shadow-soft hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Mic className="w-4 h-4" />
            {isDE ? "Aufnahme starten" : "Start recording"}
          </button>
        )}
      </div>
    </div>
  );
};

export default InlineVoiceRecorder;
