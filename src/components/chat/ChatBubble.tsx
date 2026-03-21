import { Volume2, Languages, Loader2, CheckCheck, Headphones, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { MediaMessage } from "./MediaPreview";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { playStartListenPop } from "@/lib/sounds";

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

/** Animated wave bars shown during playback */
const WaveIndicator = ({ color }: { color: string }) => (
  <span className="inline-flex items-center gap-[3px] h-4 ml-1">
    {[0, 1, 2, 3, 4].map((i) => (
      <span
        key={i}
        className={cn("wave-bar", color)}
        style={{ animationDelay: `${i * 0.12}s` }}
      />
    ))}
  </span>
);

const ChatBubble = ({ message, timestamp, isMine, senderName, onSpeak, isSpeaking, isRead, messageType, mediaUrl, senderId, onPlayClonedVoice, isPlayingCloned, msgId, hasClonedVoice }: ChatBubbleProps) => {
  const { locale, t } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const { isPremium, requirePremium, PaywallGate } = usePremiumGate();
  const { compactMode } = useAccessibility();
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const prevSpeaking = useRef(false);

  const isMedia = messageType === "image" || messageType === "video";
  const displayText = showTranslation && translated ? translated : message;
  const isActive = isSpeaking || isPlayingCloned;

  // Play subtle pop when speech starts
  useEffect(() => {
    if (isActive && !prevSpeaking.current) {
      playStartListenPop();
    }
    prevSpeaking.current = !!isActive;
  }, [isActive]);

  // 1-Click: tap bubble to listen
  const handleBubbleTap = () => {
    if (!message || isMedia) return;
    if (onSpeak) {
      onSpeak(displayText);
    }
  };

  const doTranslate = async () => {
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

  const handleTranslate = (e: React.MouseEvent) => {
    e.stopPropagation();
    requirePremium(doTranslate);
  };

  const handlePlayCloned = (e: React.MouseEvent) => {
    e.stopPropagation();
    requirePremium(() => onPlayClonedVoice?.(message, senderId!, msgId!));
  };

  const speakingLabel = isPlayingCloned
    ? `${senderName || t("chat.contact") || "Kontakt"} ${t("chat.speaking") || "spricht…"}`
    : t("chat.readingAloud") || "Wird vorgelesen…";

  return (
    <>
    <PaywallGate />
    <div className={cn("flex w-full mb-3", isMine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[80%] animate-reveal-up")}>
        {!isMine && senderName && (
          <span className="text-xs font-medium text-muted-foreground ml-3 mb-0.5 block">
            {senderName}
          </span>
        )}
        <div
          onClick={handleBubbleTap}
          onDoubleClick={() => !isMine && message && setShowActions(!showActions)}
          className={cn(
            "shadow-sm cursor-pointer select-none transition-all duration-200",
            isMedia ? "rounded-2xl overflow-hidden" : "px-4 py-3",
            isMine
              ? "bg-chat-mine text-chat-mine-foreground rounded-[1.25rem] rounded-br-md"
              : "bg-chat-theirs text-chat-theirs-foreground rounded-[1.25rem] rounded-bl-md",
            isActive && "ring-2 shadow-md",
            isSpeaking && !isPlayingCloned && "ring-primary/40",
            isPlayingCloned && "ring-accent/40"
          )}
        >
          {/* Speaking indicator with wave animation */}
          {isActive && (
            <div className={cn(
              "flex items-center gap-1 mb-1.5 text-xs font-medium",
              isMine ? "text-chat-mine-foreground/80" : "text-primary"
            )}>
              {speakingLabel}
              <WaveIndicator color={isMine ? "bg-chat-mine-foreground/60" : "bg-primary"} />
            </div>
          )}

          {/* Media content */}
          {isMedia && mediaUrl && (
            <MediaMessage
              url={mediaUrl}
              type={messageType as "image" | "video"}
              isMine={isMine}
            />
          )}

          {/* Text */}
          {message && !(isMedia && !message.trim()) && (() => {
            const isLong = compactMode && displayText.length > 120 && !expanded;
            const truncated = isLong ? displayText.slice(0, 120) + "…" : displayText;
            return (
              <div onClick={isLong ? (e: React.MouseEvent) => { e.stopPropagation(); setExpanded(true); } : undefined}>
                <p className={cn(
                  "text-[0.938rem] leading-relaxed break-words",
                  isMedia && "px-4 pt-2"
                )} style={{ overflowWrap: "anywhere" }}>
                  {truncated}
                </p>
                {isLong && (
                  <p className={cn(
                    "text-xs font-medium mt-0.5 opacity-70",
                    isMedia && "px-4",
                    isMine ? "text-chat-mine-foreground/70" : "text-primary"
                  )}>
                    {t("chat.showMore") || "Mehr anzeigen"}
                  </p>
                )}
              </div>
            );
          })()}

          {showTranslation && translated && (
            <p className={cn("text-[0.75rem] mt-1 opacity-60 italic", isMedia && "px-4")}>
              {t("chat.translated")}
            </p>
          )}

          {/* Footer: time + minimal actions */}
          <div className={cn("flex items-center justify-between mt-1.5", isMedia && "px-4 pb-2")}>
            <div className="flex items-center gap-1.5">
              {!isMine && showActions && (
                <>
                  {hasClonedVoice && senderId && msgId && onPlayClonedVoice && message && (
                    <button
                      onClick={handlePlayCloned}
                      className="p-1.5 rounded-full bg-accent/10 text-accent transition-colors active:scale-90"
                      aria-label={t("chat.listenClonedVoice") || "Mit geklonter Stimme anhören"}
                    >
                      {isPremium ? <Headphones className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  )}
                  {message && (
                    <button
                      onClick={handleTranslate}
                      disabled={isTranslating}
                      className={cn(
                        "p-1.5 rounded-full transition-colors active:scale-90",
                        showTranslation ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      )}
                      aria-label={t("chat.translate")}
                    >
                      {isTranslating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

            <span
              className={cn(
                "text-[0.688rem] flex items-center gap-0.5 ml-auto",
                isMine ? "text-chat-mine-foreground/60" : "text-muted-foreground"
              )}
            >
              {timestamp}
              {isMine && (
                isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )
              )}
            </span>
          </div>
        </div>

        {/* Tap hint for non-own messages */}
        {!isMine && message && !isMedia && !isActive && (
          <p className="text-[0.625rem] text-muted-foreground/50 ml-3 mt-0.5">
            {t("chat.tapToListen") || "Tippen zum Anhören · Doppeltippen für mehr"}
          </p>
        )}
      </div>
    </div>
    </>
   );
};

export default ChatBubble;
