import { Volume2, Languages, Loader2, CheckCheck, Headphones, Lock, Trash2, SmilePlus, Crown, Mic2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { MediaMessage } from "./MediaPreview";
import AudioPlayer from "./AudioPlayer";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { playStartListenPop } from "@/lib/sounds";
import EmojiReactions from "./EmojiReactions";
import type { Reaction } from "@/hooks/useMessageReactions";

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
  reactions?: Reaction[];
  onToggleReaction?: (msgId: string, emoji: string) => void;
  onDelete?: (msgId: string) => void;
  onSaveAsVoiceSample?: (audioUrl: string, senderId: string) => void;
  replyToText?: string;
  replyToSender?: string;
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

const ChatBubble = ({ message, timestamp, isMine, senderName, onSpeak, isSpeaking, isRead, messageType, mediaUrl, senderId, onPlayClonedVoice, isPlayingCloned, msgId, hasClonedVoice, reactions = [], onToggleReaction, onDelete, onSaveAsVoiceSample, replyToText, replyToSender }: ChatBubbleProps) => {
  const { locale, t } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const { isPremium, requirePremium, PaywallGate } = usePremiumGate();
  const { compactMode } = useAccessibility();
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceSaveConfirm, setShowVoiceSaveConfirm] = useState(false);
  const prevSpeaking = useRef(false);

  const isMedia = messageType === "image" || messageType === "video";
  const isAudio = messageType === "audio";
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
          onDoubleClick={() => message && setShowActions(!showActions)}
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

          {/* Reply quote */}
          {replyToText && replyToSender && (
            <div className={cn(
              "flex gap-2 mb-2 rounded-lg px-2.5 py-1.5 text-xs",
              isMine ? "bg-chat-mine-foreground/10" : "bg-primary/10"
            )}>
              <div className={cn("w-0.5 rounded-full shrink-0", isMine ? "bg-chat-mine-foreground/40" : "bg-primary")} />
              <div className="min-w-0">
                <p className={cn("font-semibold", isMine ? "text-chat-mine-foreground/80" : "text-primary")}>{replyToSender}</p>
                <p className="truncate opacity-70">{replyToText}</p>
              </div>
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

          {/* Audio content */}
          {isAudio && message && (
            <div>
              <AudioPlayer url={message} isMine={isMine} />
              {/* Save voice sample button - always visible on received audio */}
              {!isMine && senderId && onSaveAsVoiceSample && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowVoiceSaveConfirm(true); }}
                    className={cn(
                      "flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors active:scale-95",
                      "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    aria-label="Als Stimmprobe speichern"
                  >
                    {isPremium ? <Mic2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    Stimmprobe speichern
                  </button>

                  {/* Confirmation dialog */}
                  {showVoiceSaveConfirm && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
                      onClick={(e) => { e.stopPropagation(); setShowVoiceSaveConfirm(false); }}
                    >
                      <div
                        className="bg-background rounded-2xl p-5 mx-6 max-w-sm w-full shadow-xl animate-reveal-up"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Mic2 className="w-5 h-5 text-primary" />
                          <h3 className="text-base font-semibold text-foreground">Stimmprobe speichern?</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-1">
                          Diese Sprachnachricht wird als Stimmprobe für <strong className="text-foreground">{senderName || "diesen Kontakt"}</strong> verwendet.
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                          Danach können Textnachrichten in dieser Stimme vorgelesen werden. Die Stimmprobe wird sicher in der Cloud gespeichert.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowVoiceSaveConfirm(false); }}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-foreground active:scale-95 transition-transform"
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowVoiceSaveConfirm(false);
                              requirePremium(() => onSaveAsVoiceSample!(message, senderId!));
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground active:scale-95 transition-transform"
                          >
                            Speichern
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Text */}
          {message && !isMedia && !isAudio && (() => {
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
              {showActions && (
                <>
                  {/* Emoji picker trigger */}
                  {msgId && onToggleReaction && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
                      className="p-1.5 rounded-full bg-secondary text-muted-foreground transition-colors active:scale-90"
                      aria-label="Emoji-Reaktion"
                    >
                      <SmilePlus className="w-4 h-4" />
                    </button>
                  )}
                  {!isMine && hasClonedVoice && senderId && msgId && onPlayClonedVoice && message && (
                    <button
                      onClick={handlePlayCloned}
                      className="p-1.5 rounded-full bg-accent/10 text-accent transition-colors active:scale-90"
                      aria-label={t("chat.listenClonedVoice") || "Mit geklonter Stimme anhören"}
                    >
                      {isPremium ? <Headphones className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  )}
                  {!isMine && message && (
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
                        <span className="relative">
                          <Languages className="w-4 h-4" />
                          {!isPremium && <Crown className="w-2.5 h-2.5 text-accent absolute -top-1 -right-1.5" />}
                        </span>
                      )}
                    </button>
                  )}
                  {isMine && msgId && onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(msgId); }}
                      className="p-1.5 rounded-full bg-destructive/10 text-destructive transition-colors active:scale-90"
                      aria-label="Nachricht löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {/* Save voice message as voice sample for this contact */}
                  {!isMine && isAudio && senderId && onSaveAsVoiceSample && message && (
                    <button
                      onClick={(e) => { e.stopPropagation(); requirePremium(() => onSaveAsVoiceSample(message, senderId!)); }}
                      className="p-1.5 rounded-full bg-primary/10 text-primary transition-colors active:scale-90"
                      aria-label="Als Stimmprobe speichern"
                      title="Als Stimmprobe speichern"
                    >
                      {isPremium ? <Mic2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
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

          {/* Emoji reactions display */}
          {msgId && onToggleReaction && (
            <EmojiReactions
              reactions={reactions}
              onToggle={(emoji) => onToggleReaction(msgId, emoji)}
              isMine={isMine}
              showPicker={showEmojiPicker}
              onTogglePicker={() => setShowEmojiPicker(!showEmojiPicker)}
            />
          )}
        </div>

        {/* Tap hint for non-own messages */}
        {!isMine && message && !isMedia && !isActive && (
          <p className="text-[0.625rem] text-muted-foreground/50 ml-3 mt-0.5">
            {t("chat.tapToListen") || "Tippen zum Anhören · Doppeltippen für Aktionen"}
          </p>
        )}
        {isMine && message && !isMedia && !isActive && (
          <p className="text-[0.625rem] text-muted-foreground/50 mr-3 mt-0.5 text-right">
            Doppeltippen für Aktionen
          </p>
        )}
      </div>
    </div>
    </>
   );
};

export default ChatBubble;
