import { Volume2, VolumeX, Languages, Loader2, Check, CheckCheck, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { MediaMessage } from "./MediaPreview";

interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isMine: boolean;
  senderName?: string;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  isRead?: boolean;
  messageType?: string;
  mediaUrl?: string;
  senderId?: string;
  onPlayClonedVoice?: (text: string, senderId: string, msgId: string) => void;
  isPlayingCloned?: boolean;
  msgId?: string;
  hasClonedVoice?: boolean;
}

const ChatBubble = ({ message, timestamp, isMine, senderName, onSpeak, isSpeaking, isRead, messageType, mediaUrl, senderId, onPlayClonedVoice, isPlayingCloned, msgId, hasClonedVoice }: ChatBubbleProps) => {
  const { locale, t } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const isMedia = messageType === "image" || messageType === "video";

  const handleTranslate = async () => {
    if (translated) {
      setShowTranslation(!showTranslation);
      return;
    }
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { text: message, targetLang: locale },
      });
      if (error) throw error;
      setTranslated(data.translated);
      setShowTranslation(true);
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setIsTranslating(false);
    }
  };

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
            "shadow-sm",
            isMedia ? "rounded-2xl overflow-hidden" : "px-4 py-2.5",
            isMine
              ? "bg-chat-mine text-chat-mine-foreground rounded-[1.25rem] rounded-br-md"
              : "bg-chat-theirs text-chat-theirs-foreground rounded-[1.25rem] rounded-bl-md"
          )}
        >
          {/* Media content */}
          {isMedia && mediaUrl && (
            <MediaMessage
              url={mediaUrl}
              type={messageType as "image" | "video"}
              isMine={isMine}
            />
          )}

          {/* Text or caption */}
          {message && !(isMedia && !message.trim()) && (
            <p className={cn(
              "text-[0.938rem] leading-relaxed break-words",
              isMedia && "px-4 pt-2"
            )} style={{ overflowWrap: "anywhere" }}>
              {showTranslation && translated ? translated : message}
            </p>
          )}

          {showTranslation && translated && (
            <p className={cn("text-[0.75rem] mt-1 opacity-60 italic", isMedia && "px-4")}>
              {t("chat.translated")}
            </p>
          )}

          <div className={cn("flex items-center justify-between mt-1", isMedia && "px-4 pb-2")}>
            <div className="flex items-center gap-1">
              {onSpeak && message && (
                <button
                  onClick={() => onSpeak(showTranslation && translated ? translated : message)}
                  className={cn(
                    "p-1 rounded-full transition-colors",
                    isMine
                      ? "hover:bg-chat-mine-foreground/10 text-chat-mine-foreground/60"
                      : "hover:bg-foreground/5 text-muted-foreground"
                  )}
                  aria-label={t("chat.readAloud")}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}
              {!isMine && message && (
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className={cn(
                    "p-1 rounded-full transition-colors",
                    "hover:bg-foreground/5 text-muted-foreground",
                    showTranslation && "text-primary"
                  )}
                  aria-label={t("chat.translate")}
                >
                  {isTranslating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Languages className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
            <span
              className={cn(
                "text-[0.688rem] flex items-center gap-0.5",
                isMine ? "text-chat-mine-foreground/60" : "text-muted-foreground"
              )}
            >
              {timestamp}
              {isMine && (
                isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
