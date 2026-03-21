import { useState, useRef } from "react";
import { Send, Camera, ImagePlus, X } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const currentText = isListening ? transcript : text;

  const handleSend = () => {
    // Send attachments
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
    e.target.value = "";
  };

  const handleCameraCapture = (file: File, type: "image" | "video") => {
    setAttachments((prev) => [...prev, { file, type }]);
    setShowCamera(false);
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
          {/* Media buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => setShowCamera(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              aria-label="Kamera öffnen"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              aria-label="Bild oder Video auswählen"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <VoiceButton isListening={isListening} onToggle={onVoiceToggle} />

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

          <button
            onClick={handleSend}
            disabled={!hasContent}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full shrink-0",
              "transition-all duration-200 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hasContent
                ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
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
