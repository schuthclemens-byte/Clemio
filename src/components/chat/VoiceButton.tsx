import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isListening: boolean;
  onToggle: () => void;
}

const VoiceButton = ({ isListening, onToggle }: VoiceButtonProps) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 shrink-0",
        "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isListening
          ? "bg-accent text-accent-foreground animate-voice-pulse"
          : "bg-secondary text-secondary-foreground hover:bg-accent/20"
      )}
      aria-label={isListening ? "Aufnahme stoppen" : "Sprachnachricht starten"}
    >
      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};

export default VoiceButton;
