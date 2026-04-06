import { Languages, Loader2, CheckCheck, Headphones, Lock, Trash2, SmilePlus, Crown, Mic2, Pencil } from "lucide-react";
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
import SaveVoiceSampleDialog from "./SaveVoiceSampleDialog";

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
  onPlayClonedVoice?: (text: string, senderId: string, msgId: string, lang?: string) => void;
  isPlayingCloned?: boolean;
  isLoadingCloned?: boolean;
  msgId?: string;
  createdAt?: string;
  hasClonedVoice?: boolean;
  reactions?: Reaction[];
  onToggleReaction?: (msgId: string, emoji: string) => void;
  onDelete?: (msgId: string) => void;
  onEdit?: (msgId: string, newContent: string) => void;
  onSaveAsVoiceSample?: (audioUrl: string, senderId: string) => void;
  replyToText?: string;
  replyToSender?: string;
  uploadProgress?: number;
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

const ChatBubble = ({ message, timestamp, isMine, senderName, onSpeak, isSpeaking, isRead, messageType, mediaUrl, senderId, onPlayClonedVoice, isPlayingCloned, isLoadingCloned, msgId, hasClonedVoice, reactions = [], onToggleReaction, onDelete, onSaveAsVoiceSample, replyToText, replyToSender, uploadProgress }: ChatBubbleProps) => {
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

  const isUploading = typeof uploadProgress === "number";

  const isMedia = messageType === "image" || messageType === "video";
  const isAudio = messageType === "audio";
  const displayText = showTranslation && translated ? translated : message;
  const isActive = isSpeaking || isPlayingCloned || isLoadingCloned;

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
    // Only play with cloned voice – no generic TTS
    if (!isMine && hasClonedVoice && senderId && msgId && onPlayClonedVoice) {
      requirePremium(() => onPlayClonedVoice(displayText, senderId, msgId, locale));
    } else if (!isMine && !hasClonedVoice) {
      import("sonner").then(({ toast }) =>
        toast.info("Speichere zuerst eine Stimmprobe, um Nachrichten in dieser Stimme anzuhören.")
      );
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
    requirePremium(() => onPlayClonedVoice?.(message, senderId!, msgId!, locale));
  };

  const handleConfirmVoiceSave = () => {
    setShowVoiceSaveConfirm(false);
    requirePremium(() => onSaveAsVoiceSample?.(message, senderId!));
  };

  const speakingLabel = isLoadingCloned
    ? "Lädt Stimme…"
    : isPlayingCloned
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
              {isUploading ? (
                <div className="flex items-center gap-3 min-w-[180px] py-2">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                    isMine ? "bg-chat-mine-foreground/20" : "bg-primary/15"
                  )}>
                    <Loader2 className={cn("w-4 h-4 animate-spin", isMine ? "text-chat-mine-foreground" : "text-primary")} />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isMine ? "bg-chat-mine-foreground/70" : "bg-primary"
                        )}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[0.625rem] font-medium",
                      isMine ? "text-chat-mine-foreground/60" : "text-muted-foreground"
                    )}>
                      {uploadProgress < 100 ? `Hochladen… ${uploadProgress}%` : "Wird gespeichert…"}
                    </span>
                  </div>
                </div>
              ) : (
                <AudioPlayer url={message} isMine={isMine} />
              )}
              {/* Save voice sample button - always visible on received audio */}
              {!isMine && !isUploading && senderId && onSaveAsVoiceSample && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowVoiceSaveConfirm(true); }}
                    className={cn(
                      "flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors active:scale-95",
                      "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    aria-label="Eigene Stimme erstellen"
                  >
                    {isPremium ? <Mic2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    Eigene Stimme erstellen
                  </button>
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
                      onClick={(e) => { e.stopPropagation(); setShowVoiceSaveConfirm(true); }}
                      className="p-1.5 rounded-full bg-primary/10 text-primary transition-colors active:scale-90"
                      aria-label="Eigene Stimme erstellen"
                      title="Eigene Stimme erstellen"
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

          {senderId && onSaveAsVoiceSample && message && (
            <SaveVoiceSampleDialog
              open={showVoiceSaveConfirm}
              onOpenChange={setShowVoiceSaveConfirm}
              onConfirm={handleConfirmVoiceSave}
              senderName={senderName}
              isPremium={isPremium}
            />
          )}
        </div>

        {/* Tap hint for non-own messages */}
        {!isMine && message && !isMedia && !isActive && hasClonedVoice && (
          <p className="text-[0.625rem] text-muted-foreground/50 ml-3 mt-0.5">
            {t("chat.tapToListen") || "Tippen zum Anhören · Doppeltippen für Aktionen"}
          </p>
        )}
        {!isMine && message && !isMedia && !isActive && !hasClonedVoice && (
          <p className="text-[0.625rem] text-muted-foreground/50 ml-3 mt-0.5">
            Doppeltippen für Aktionen
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
