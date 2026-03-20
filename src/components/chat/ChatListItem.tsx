import { cn } from "@/lib/utils";

interface ChatListItemProps {
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  avatar?: string;
  onClick: () => void;
}

const ChatListItem = ({ name, lastMessage, time, unread, avatar, onClick }: ChatListItemProps) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3.5 text-left",
        "transition-colors duration-150 hover:bg-secondary/60 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      )}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-[0.938rem] truncate">{name}</h3>
          <span className="text-xs text-muted-foreground shrink-0">{time}</span>
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">{lastMessage}</p>
      </div>
      {unread && unread > 0 ? (
        <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-[0.688rem] font-semibold flex items-center justify-center shrink-0">
          {unread}
        </span>
      ) : null}
    </button>
  );
};

export default ChatListItem;
