import { cn } from "@/lib/utils";
import { EMOJIS, type Reaction } from "@/hooks/useMessageReactions";

interface EmojiReactionsProps {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
  isMine: boolean;
  showPicker: boolean;
  onTogglePicker: () => void;
}

const EmojiReactions = ({ reactions, onToggle, isMine, showPicker, onTogglePicker }: EmojiReactionsProps) => {
  return (
    <div className="relative">
      {/* Existing reactions */}
      {reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={(e) => { e.stopPropagation(); onToggle(r.emoji); }}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all active:scale-90",
                r.hasReacted
                  ? "bg-primary/15 border border-primary/30"
                  : "bg-secondary border border-border hover:bg-secondary/80"
              )}
            >
              <span>{r.emoji}</span>
              {r.count > 1 && <span className="text-muted-foreground">{r.count}</span>}
            </button>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePicker(); }}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary border border-border hover:bg-secondary/80 transition-colors active:scale-90"
          >
            +
          </button>
        </div>
      )}

      {/* Picker */}
      {showPicker && (
        <div className={cn(
          "absolute z-20 flex gap-1 p-2 rounded-2xl bg-card border border-border shadow-elevated animate-reveal-up",
          isMine ? "right-0 bottom-full mb-1" : "left-0 bottom-full mb-1"
        )}>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(emoji);
                onTogglePicker();
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:bg-secondary transition-colors active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmojiReactions;
