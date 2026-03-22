import { useState, useRef, useCallback } from "react";
import { Send, Plus, Camera, ImagePlus, Mic } from "lucide-react";
import VoiceButton from "./VoiceButton";
import MediaPreview from "./MediaPreview";
import CameraCapture from "./CameraCapture";
import VoiceRecorder from "./VoiceRecorder";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useAutoCorrect } from "@/hooks/useAutoCorrect";

interface MediaAttachment {
  file: File;
  type: "image" | "video";
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendMedia: (file: File, type: "image" | "video", caption?: string) => void;
  onSendVoice?: (file: File) => void;
  isListening: boolean;
  onVoiceToggle: () => void;
  transcript: string;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

const ChatInput = ({ onSend, onSendMedia, onSendVoice, isListening, onVoiceToggle, transcript, onTyping, onStopTyping }: ChatInputProps) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t, locale } = useI18n();
  const { autoCorrect: autoCorrectEnabled } = useAccessibility();
  const { suggestions, updateSuggestions, autoCorrect, applySuggestion } = useAutoCorrect(locale, autoCorrectEnabled);

  const currentText = isListening ? transcript : text;

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newText = e.target.value;
    
    // Auto-correct on space
    const corrected = autoCorrect(newText);
    if (corrected) {
      newText = corrected;
    }
    
    setText(newText);
    updateSuggestions(newText);
    
    if (onTyping) {
      onTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 3000);
    }
  }, [onTyping, onStopTyping, autoCorrect, updateSuggestions]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    const newText = applySuggestion(text, suggestion);
    setText(newText);
    updateSuggestions(newText);
  }, [text, applySuggestion, updateSuggestions]);

  const handleSend = () => {
    if (attachments.length > 0) {
      for (const att of attachments) {
        onSendMedia(att.file, att.type, currentText.trim() || undefined);
      }
      setAttachments([]);
      setText("");
      updateSuggestions("");
      onStopTyping?.();
      return;
    }

    const msg = currentText.trim();
    if (!msg) return;
    onSend(msg);
    setText("");
    updateSuggestions("");
    onStopTyping?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: MediaAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newAttachments.push({ file, type: "image" });
      } else if (file.type.startsWith("video/")) {
        newAttachments.push({ file, type: "video" });
      }
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
    setShowMediaMenu(false);
    e.target.value = "";
  };

  const handleCameraCapture = (file: File, type: "image" | "video") => {
    setAttachments((prev) => [...prev, { file, type }]);
    setShowCamera(false);
    setShowMediaMenu(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const hasContent = currentText.trim() || attachments.length > 0;

  return (
    <>
      <div className="bg-card border-t border-border">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 px-3 pt-3 overflow-x-auto">
            {attachments.map((att, i) => (
              <MediaPreview
                key={i}
                file={att.file}
                type={att.type}
                onRemove={() => removeAttachment(i)}
              />
            ))}
          </div>
        )}

        {/* Word suggestions bar */}
        {suggestions.length > 0 && !isListening && (
          <div className="flex gap-2 px-3 pt-2 overflow-x-auto">
            {suggestions.map((word) => (
              <button
                key={word}
                onClick={() => handleSuggestionClick(word)}
                className="px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-primary/10 text-sm font-medium text-foreground transition-colors active:scale-95 whitespace-nowrap border border-border/50"
              >
                {word}
              </button>
            ))}
          </div>
        )}

        {/* Voice recorder */}
        {showVoiceRecorder && onSendVoice && (
          <div className="px-3 pt-3">
            <VoiceRecorder onSend={(file) => {
              onSendVoice(file);
              setShowVoiceRecorder(false);
            }} />
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          {/* + button for media */}
          <div className="relative">
            <button
              onClick={() => setShowMediaMenu(!showMediaMenu)}
              className={cn(
                "flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 active:scale-90",
                showMediaMenu
                  ? "bg-primary text-primary-foreground rotate-45"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
              aria-label={t("chat.addMedia")}
            >
              <Plus className="w-5 h-5" />
            </button>

            {showMediaMenu && (
              <div className="absolute bottom-14 left-0 flex gap-2 bg-card border border-border rounded-2xl p-2 shadow-elevated animate-reveal-up">
                <button
                  onClick={() => { setShowCamera(true); setShowMediaMenu(false); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-secondary transition-colors active:scale-95"
                >
                  <Camera className="w-5 h-5 text-primary" />
                  <span className="text-[0.625rem] text-muted-foreground">{t("chat.camera")}</span>
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-secondary transition-colors active:scale-95"
                >
                  <ImagePlus className="w-5 h-5 text-primary" />
                  <span className="text-[0.625rem] text-muted-foreground">{t("chat.gallery")}</span>
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Voice dictation button */}
          <VoiceButton isListening={isListening} onToggle={onVoiceToggle} />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={currentText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? t("chat.listening") : t("chat.placeholder")}
              rows={1}
              className={cn(
                "w-full resize-none rounded-2xl bg-secondary px-4 py-3 text-[0.938rem]",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                "max-h-32 overflow-y-auto",
                isListening && "border-2 border-accent/40 bg-accent/5"
              )}
              readOnly={isListening}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label={t("chat.placeholder")}
            />
          </div>

          {/* Send or Voice Record */}
          {hasContent ? (
            <button
              onClick={handleSend}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full shrink-0",
                "transition-all duration-200 active:scale-90",
                "gradient-primary text-primary-foreground shadow-soft hover:shadow-elevated"
              )}
              aria-label={t("chat.send")}
            >
              <Send className="w-5 h-5" />
            </button>
          ) : onSendVoice ? (
            <button
              onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full shrink-0",
                "transition-all duration-200 active:scale-90",
                showVoiceRecorder
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
              aria-label="Sprachnachricht"
            >
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <button
              disabled
              className="flex items-center justify-center w-12 h-12 rounded-full shrink-0 bg-secondary text-muted-foreground"
              aria-label={t("chat.send")}
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <CameraCapture
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </>
  );
};

export default ChatInput;
