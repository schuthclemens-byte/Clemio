import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReplyPreviewProps {
  senderName: string;
  text: string;
  onClear: () => void;
}

const ReplyPreview = ({ senderName, text, onClear }: ReplyPreviewProps) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-t border-border animate-fade-in">
    <div className="w-1 h-8 rounded-full bg-primary shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-primary truncate">{senderName}</p>
      <p className="text-xs text-muted-foreground truncate">{text}</p>
    </div>
    <button
      onClick={onClear}
      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
      aria-label="Antwort abbrechen"
    >
      <X className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  </div>
);

export default ReplyPreview;
