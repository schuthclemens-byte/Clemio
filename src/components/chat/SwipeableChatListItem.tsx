import { useRef, useState, type ReactNode } from "react";
import { Trash2, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/AccessibilityContext";

interface SwipeableChatListItemProps {
  children: ReactNode;
  onDelete: () => void;
  onArchive: () => void;
}

const THRESHOLD = 80;

const SwipeableChatListItem = ({ children, onDelete, onArchive }: SwipeableChatListItemProps) => {
  const { handedness } = useAccessibility();
  const isLeft = handedness === "left";
  const startX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX.current;
    if (isLeft) {
      // Swipe right reveals actions on the left
      if (diff > 0) {
        setOffset(Math.min(diff, 180));
      }
    } else {
      // Swipe left reveals actions on the right
      if (diff < 0) {
        setOffset(Math.max(diff, -180));
      }
    }
  };

  const onTouchEnd = () => {
    if (Math.abs(offset) >= THRESHOLD) {
      setOffset(isLeft ? 160 : -160);
    } else {
      setOffset(0);
    }
    setSwiping(false);
  };

  const close = () => setOffset(0);

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons behind */}
      <div
        className={cn(
          "absolute top-0 bottom-0 flex items-stretch",
          isLeft ? "left-0 flex-row-reverse" : "right-0"
        )}
      >
        <button
          onClick={() => { close(); onArchive(); }}
          className="w-20 flex flex-col items-center justify-center gap-1 bg-accent text-accent-foreground transition-colors active:opacity-80"
        >
          <Archive className="w-5 h-5" />
          <span className="text-[0.625rem] font-medium">Archiv</span>
        </button>
        <button
          onClick={() => { close(); onDelete(); }}
          className="w-20 flex flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground transition-colors active:opacity-80"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[0.625rem] font-medium">Löschen</span>
        </button>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative bg-background"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.25s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableChatListItem;
