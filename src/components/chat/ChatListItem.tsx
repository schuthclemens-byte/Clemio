import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ChatListItemProps {
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  avatar?: string;
  onClick: () => void;
}

const ChatListItem = forwardRef<HTMLButtonElement, ChatListItemProps>(({ name, lastMessage, time, unread, avatar, onClick }, ref) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Generate a consistent color from name
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const hasUnread = unread && unread > 0;

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3.5 w-full px-5 py-4 text-left",
        "transition-all duration-200 hover:bg-secondary/50 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        hasUnread && "unread-bar"
      )}
    >
      {/* Square avatar with rounded corners */}
      <div
        className="rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-primary-foreground overflow-hidden"
        style={{
          width: "3.25rem",
          height: "3.25rem",
          borderRadius: "0.875rem",
          background: avatar ? undefined : `linear-gradient(135deg, hsl(${hue} 60% 55%), hsl(${(hue + 40) % 360} 50% 60%))`,
        }}
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={cn(
            "text-[0.938rem] truncate",
            hasUnread ? "font-bold" : "font-semibold"
          )}>{name}</h3>
          <span className={cn(
            "text-xs shrink-0",
            hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
          )}>{time}</span>
        </div>
        <p className={cn(
          "text-sm truncate mt-0.5",
          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
        )}>{lastMessage}</p>
      </div>
      {hasUnread ? (
        <span className="min-w-[1.375rem] h-[1.375rem] px-1.5 rounded-full gradient-primary text-primary-foreground text-[0.688rem] font-bold flex items-center justify-center shrink-0 shadow-soft">
          {unread}
        </span>
      ) : null}
    </button>
  );
});

ChatListItem.displayName = "ChatListItem";

export default ChatListItem;
