import { Languages, Loader2, CheckCheck, Volume2, Trash2, SmilePlus, Crown, Pencil, Forward, Flag } from "lucide-react";
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
  readAt?: string;
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
  replyToText?: string;
  replyToSender?: string;
  replyToId?: string;
  onScrollToMessage?: (msgId: string) => void;
  uploadProgress?: number;
  isEdited?: boolean;
  onForward?: (content: string, messageType: string) => void;
  /** Transcribed text for audio messages */
  transcription?: string;
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

const ChatBubble = ({ message, timestamp, isMine, senderName, onSpeak, isSpeaking, isRead, readAt, messageType, mediaUrl, senderId, onPlayClonedVoice, isPlayingCloned, isLoadingCloned, msgId, createdAt, hasClonedVoice, reactions = [], onToggleReaction, onDelete, onEdit, replyToText, replyToSender, replyToId, onScrollToMessage, uploadProgress, isEdited, onForward, transcription }: ChatBubbleProps) => {
  const { locale, t } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const { isPremium, requirePremium, PaywallGate } = usePremiumGate();
  const { compactMode } = useAccessibility();
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message);
  const prevSpeaking = useRef(false);

  const isUploading = typeof uploadProgress === "number";

  // Check if message can still be edited/deleted (within 15 min and unread)
  const canModify = isMine && !isRead && createdAt
    ? (Date.now() - new Date(createdAt).getTime()) < 15 * 60 * 1000
    : false;

  const isMedia = messageType === "image" || messageType === "video";
  const isAudio = messageType === "audio";
  
  // For audio messages, show transcription as text; otherwise show original message
  const textContent = isAudio ? (transcription || message) : message;
  const displayText = showTranslation && translated ? translated : textContent;
  const isActive = isSpeaking || isPlayingCloned || isLoadingCloned;

  // Play subtle pop when speech starts
  useEffect(() => {
    if (isActive && !prevSpeaking.current) {
      playStartListenPop();
    }
    prevSpeaking.current = !!isActive;
  }, [isActive]);

  // "Anhören" button handler — uses TTS with sender's voice if available
  const handleListen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToSpeak = displayText;
    if (!textToSpeak) return;
    
    if (hasClonedVoice && senderId && msgId && onPlayClonedVoice) {
      // Use sender's cloned voice
      requirePremium(() => onPlayClonedVoice(textToSpeak, senderId, msgId, locale));
    } else if (onPlayClonedVoice && senderId && msgId) {
      // Use default voice (still via TTS)
      onPlayClonedVoice(textToSpeak, senderId, msgId, locale);
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
        body: { text: textContent, targetLang: locale },
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

  const speakingLabel = isLoadingCloned
    ? "Lädt Stimme…"
    : isPlayingCloned
    ? `${senderName || t("chat.contact") || "Kontakt"} ${t("chat.speaking") || "spricht…"}`
    : t("chat.readingAloud") || "Wird vorgelesen…";

  return (
    <>
    <PaywallGate />
    <div className={cn("flex w-full mb-3", isMine ? "justify-end" : "justify-start")}>
      <div data-msg-id={msgId} className={cn("max-w-[80%] animate-bubble-in")}>
        {!isMine && senderName && (
          <span className="text-xs font-medium text-muted-foreground ml-3 mb-0.5 block">
            {senderName}
          </span>
        )}
        <div
          onDoubleClick={() => textContent && setShowActions(!showActions)}
          className={cn(
            "select-none transition-all duration-200",
            isMedia ? "rounded-2xl overflow-hidden cursor-pointer" : "px-4 py-3",
            isMine
              ? "bubble-glass-mine text-chat-mine-foreground rounded-[1.25rem] rounded-br-sm"
              : "bubble-glass-theirs text-chat-theirs-foreground rounded-[1.25rem] rounded-bl-sm",
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
            <div
              className={cn(
                "flex gap-2 mb-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer active:opacity-70 transition-opacity",
                isMine ? "bg-chat-mine-foreground/10" : "bg-primary/10"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (replyToId && onScrollToMessage) onScrollToMessage(replyToId);
              }}
            >
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

          {/* Audio content — show player AND transcribed text */}
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
                <>
                  <AudioPlayer url={message} isMine={isMine} />
                  {/* Show transcription below audio player */}
                  {transcription && (
                    <p className={cn(
                      "text-[0.813rem] leading-relaxed mt-2 opacity-80",
                      isMine ? "text-chat-mine-foreground/80" : "text-chat-theirs-foreground/80"
                    )} style={{ overflowWrap: "anywhere" }}>
                      {transcription}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Editing mode */}
          {isEditing && !isMedia && !isAudio && (
            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className={cn(
                  "text-[0.938rem] leading-relaxed break-words bg-transparent border-none outline-none resize-none w-full min-h-[2.5rem]",
                  isMine ? "text-chat-mine-foreground" : "text-chat-theirs-foreground"
                )}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    if (editText.trim() && editText !== message && msgId && onEdit) {
                      onEdit(msgId, editText.trim());
                    }
                    setIsEditing(false);
                  }}
                  className="text-xs px-2.5 py-1 rounded-full bg-primary text-primary-foreground"
                >
                  Speichern
                </button>
              </div>
            </div>
          )}

          {/* Text */}
          {textContent && !isMedia && !isAudio && !isEditing && (() => {
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

          {/* Footer: time + actions */}
          <div className={cn("flex items-center justify-between mt-1.5", isMedia && "px-4 pb-2")}>
            <div className="flex items-center gap-1.5">
              {/* "Anhören" button — always visible for text/audio messages */}
              {textContent && !isMedia && !isEditing && senderId && msgId && onPlayClonedVoice && !isActive && (
                <button
                  onClick={handleListen}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.688rem] font-medium transition-colors active:scale-95",
                    isMine
                      ? "bg-chat-mine-foreground/15 text-chat-mine-foreground/80 hover:bg-chat-mine-foreground/25"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <Volume2 className="w-3 h-3" />
                  {t("chat.listen") || "Anhören"}
                </button>
              )}

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
                  {!isMine && textContent && (
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
                  {canModify && msgId && onEdit && messageType !== "audio" && messageType !== "image" && messageType !== "video" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditText(message); }}
                      className="p-1.5 rounded-full bg-secondary text-muted-foreground transition-colors active:scale-90"
                      aria-label="Nachricht bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canModify && msgId && onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(msgId); }}
                      className="p-1.5 rounded-full bg-destructive/10 text-destructive transition-colors active:scale-90"
                      aria-label="Nachricht löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {/* Forward button */}
                  {onForward && textContent && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onForward(message, messageType || "text"); }}
                      className="p-1.5 rounded-full bg-secondary text-muted-foreground transition-colors active:scale-90"
                      aria-label="Weiterleiten"
                    >
                      <Forward className="w-4 h-4" />
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
              {isEdited && (
                <span className="italic mr-1">{t("chat.edited") || "bearbeitet"}</span>
              )}
              {timestamp}
              {isMine && (() => {
                const showReceipts = localStorage.getItem("clemio_read_receipts") !== "false";
                if (!showReceipts) return null;
                if (isRead) {
                  const readTime = readAt ? new Date(readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
                  return (
                    <>
                      <span className="text-accent font-medium ml-1">
                        {readTime ? `${t("chat.read") || "Gelesen"} ${readTime}` : (t("chat.read") || "Gelesen")}
                      </span>
                      <CheckCheck className="w-3.5 h-3.5 text-accent" />
                    </>
                  );
                }
                return <CheckCheck className="w-3.5 h-3.5" />;
              })()}
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

        {/* Tap hint */}
        {textContent && !isMedia && !isActive && (
          <p className="text-[0.625rem] text-muted-foreground/50 ml-3 mt-0.5">
            {isMine ? "Doppeltippen für Aktionen" : "Doppeltippen für Aktionen"}
          </p>
        )}
      </div>
    </div>
    </>
   );
};

export default ChatBubble;
