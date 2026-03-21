import { useState, useRef } from "react";
import { Send, Plus, Camera, ImagePlus, X } from "lucide-react";
import VoiceButton from "./VoiceButton";
import MediaPreview from "./MediaPreview";
import CameraCapture from "./CameraCapture";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface MediaAttachment {
  file: File;
  type: "image" | "video";
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendMedia: (file: File, type: "image" | "video", caption?: string) => void;
  isListening: boolean;
  onVoiceToggle: () => void;
  transcript: string;
}

const ChatInput = ({ onSend, onSendMedia, isListening, onVoiceToggle, transcript }: ChatInputProps) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const currentText = isListening ? transcript : text;

  const handleSend = () => {
    if (attachments.length > 0) {
      for (const att of attachments) {
        onSendMedia(att.file, att.type, currentText.trim() || undefined);
      }
      setAttachments([]);
      setText("");
      return;
    }

    const msg = currentText.trim();
    if (!msg) return;
    onSend(msg);
    setText("");
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

        <div className="flex items-end gap-2 p-3">
          {/* Single + button for media */}
          <div className="relative">
            <button
              onClick={() => setShowMediaMenu(!showMediaMenu)}
              className={cn(
                "flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 active:scale-90",
                showMediaMenu
                  ? "bg-primary text-primary-foreground rotate-45"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
              aria-label="Medien hinzufügen"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Media popover */}
            {showMediaMenu && (
              <div className="absolute bottom-14 left-0 flex gap-2 bg-card border border-border rounded-2xl p-2 shadow-elevated animate-reveal-up">
                <button
                  onClick={() => { setShowCamera(true); setShowMediaMenu(false); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-secondary transition-colors active:scale-95"
                >
                  <Camera className="w-5 h-5 text-primary" />
                  <span className="text-[0.625rem] text-muted-foreground">Kamera</span>
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-secondary transition-colors active:scale-95"
                >
                  <ImagePlus className="w-5 h-5 text-primary" />
                  <span className="text-[0.625rem] text-muted-foreground">Galerie</span>
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

          {/* Voice button */}
          <VoiceButton isListening={isListening} onToggle={onVoiceToggle} />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={currentText}
              onChange={(e) => setText(e.target.value)}
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
              aria-label={t("chat.placeholder")}
            />
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!hasContent}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full shrink-0",
              "transition-all duration-200 active:scale-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hasContent
                ? "gradient-primary text-primary-foreground shadow-soft hover:shadow-elevated"
                : "bg-secondary text-muted-foreground"
            )}
            aria-label={t("chat.send")}
          >
            <Send className="w-5 h-5" />
          </button>
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
