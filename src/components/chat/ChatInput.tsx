import { useState } from "react";
import { Send } from "lucide-react";
import VoiceButton from "./VoiceButton";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isListening: boolean;
  onVoiceToggle: () => void;
  transcript: string;
}

const ChatInput = ({ onSend, isListening, onVoiceToggle, transcript }: ChatInputProps) => {
  const [text, setText] = useState("");

  const currentText = isListening ? transcript : text;

  const handleSend = () => {
    const msg = currentText.trim();
    if (!msg) return;
    onSend(msg);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-card border-t border-border">
      <VoiceButton isListening={isListening} onToggle={onVoiceToggle} />
      <div className="flex-1 relative">
        <textarea
          value={currentText}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Ich höre zu..." : "Nachricht schreiben..."}
          rows={1}
          className={cn(
            "w-full resize-none rounded-2xl bg-secondary px-4 py-3 text-[0.938rem]",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            "max-h-32 overflow-y-auto",
            isListening && "border-2 border-accent/40 bg-accent/5"
          )}
          readOnly={isListening}
        />
      </div>
      <button
        onClick={handleSend}
        disabled={!currentText.trim()}
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full shrink-0",
          "transition-all duration-200 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          currentText.trim()
            ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
            : "bg-secondary text-muted-foreground"
        )}
        aria-label="Nachricht senden"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ChatInput;
