import { Volume2, VolumeX, Languages, Loader2, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";

interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isMine: boolean;
  senderName?: string;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  isRead?: boolean;
}

const ChatBubble = ({ message, timestamp, isMine, senderName, onSpeak, isSpeaking, isRead }: ChatBubbleProps) => {
  const { locale, t } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

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
            "px-4 py-2.5 shadow-sm",
            isMine
              ? "bg-chat-mine text-chat-mine-foreground rounded-[1.25rem] rounded-br-md"
              : "bg-chat-theirs text-chat-theirs-foreground rounded-[1.25rem] rounded-bl-md"
          )}
        >
          <p className="text-[0.938rem] leading-relaxed break-words" style={{ overflowWrap: "anywhere" }}>
            {showTranslation && translated ? translated : message}
          </p>
          {showTranslation && translated && (
            <p className="text-[0.75rem] mt-1 opacity-60 italic">
              {t("chat.translated")}
            </p>
          )}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              {/* TTS button */}
              {onSpeak && (
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
              {/* Translate button */}
              {!isMine && (
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
