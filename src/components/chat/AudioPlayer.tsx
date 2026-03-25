import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  url: string;
  isMine: boolean;
}

const AudioPlayer = ({ url, isMine }: AudioPlayerProps) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error("Audio playback failed:", error);
      setPlaying(false);
    }
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[180px] py-1">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress(a.currentTime / a.duration);
        }}
        onError={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />

      <button
        onClick={toggle}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90",
          isMine
            ? "bg-chat-mine-foreground/20 text-chat-mine-foreground"
            : "bg-primary/15 text-primary"
        )}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform bars */}
        <div className="flex items-end gap-[2px] h-5">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = 4 + Math.sin(i * 0.8) * 8 + Math.cos(i * 1.3) * 6;
            const filled = i / 24 <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-all duration-150",
                  filled
                    ? isMine ? "bg-chat-mine-foreground/80" : "bg-primary"
                    : isMine ? "bg-chat-mine-foreground/25" : "bg-muted-foreground/25"
                )}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>

        <span className={cn(
          "text-[0.625rem]",
          isMine ? "text-chat-mine-foreground/60" : "text-muted-foreground"
        )}>
          {playing ? formatTime((audioRef.current?.currentTime || 0)) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
