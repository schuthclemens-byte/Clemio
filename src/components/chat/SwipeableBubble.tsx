import { useRef, useState, type ReactNode } from "react";
import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableBubbleProps {
  children: ReactNode;
  isMine: boolean;
  onSwipeReply: () => void;
}

const THRESHOLD = 60;

const SwipeableBubble = ({ children, isMine, onSwipeReply }: SwipeableBubbleProps) => {
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
    // Only allow swipe right (for reply)
    if (diff > 0) {
      setOffset(Math.min(diff, 100));
    }
  };

  const onTouchEnd = () => {
    if (offset >= THRESHOLD) {
      onSwipeReply();
    }
    setOffset(0);
    setSwiping(false);
  };

  const progress = Math.min(offset / THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden">
      {/* Reply icon behind */}
      <div
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center",
          "w-9 h-9 rounded-full bg-primary/15 text-primary transition-all duration-150"
        )}
        style={{
          opacity: progress,
          transform: `translateY(-50%) scale(${0.5 + progress * 0.5})`,
        }}
      >
        <Reply className="w-4 h-4" />
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableBubble;
