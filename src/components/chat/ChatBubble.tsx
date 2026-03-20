import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isMine: boolean;
  senderName?: string;
}

const ChatBubble = ({ message, timestamp, isMine, senderName }: ChatBubbleProps) => {
  return (
    <div className={cn("flex w-full mb-3", isMine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%] animate-reveal-up")}>
        {!isMine && senderName && (
          <span className="text-xs font-medium text-muted-foreground ml-3 mb-0.5 block">
            {senderName}
          </span>
        )}
        <div
          className={cn(
            "px-4 py-2.5 shadow-sm",
            isMine
              ? "bg-chat-mine text-chat-mine-foreground rounded-[1.25rem] rounded-br-md"
              : "bg-chat-theirs text-chat-theirs-foreground rounded-[1.25rem] rounded-bl-md"
          )}
        >
          <p className="text-[0.938rem] leading-relaxed break-words overflow-wrap-anywhere">
            {message}
          </p>
          <span
            className={cn(
              "text-[0.688rem] mt-1 block text-right",
              isMine ? "text-chat-mine-foreground/60" : "text-muted-foreground"
            )}
          >
            {timestamp}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
