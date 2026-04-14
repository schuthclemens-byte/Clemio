import { Copy, Reply, Flag, Ban, SmilePlus, Languages, Pencil, Trash2, Forward, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface MessageAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  show?: boolean;
}

interface MessageContextMenuProps {
  open: boolean;
  onClose: () => void;
  isMine: boolean;
  textContent?: string;
  onReply?: () => void;
  onCopy?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  onReaction?: () => void;
  onTranslate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onForward?: () => void;
  canModify?: boolean;
  canTranslate?: boolean;
}

const MessageContextMenu = ({
  open, onClose, isMine, textContent,
  onReply, onCopy, onReport, onBlock,
  onReaction, onTranslate, onEdit, onDelete, onForward,
  canModify, canTranslate,
}: MessageContextMenuProps) => {
  const { t } = useI18n();

  if (!open) return null;

  const actions: MessageAction[] = [
    { icon: Reply, label: t("chat.reply") || "Antworten", onClick: () => { onReply?.(); onClose(); }, show: !!onReply },
    { icon: Copy, label: t("chat.copy") || "Kopieren", onClick: () => { onCopy?.(); onClose(); }, show: !!textContent },
    { icon: SmilePlus, label: "Reagieren", onClick: () => { onReaction?.(); onClose(); }, show: !!onReaction },
    { icon: Forward, label: t("chat.forward") || "Weiterleiten", onClick: () => { onForward?.(); onClose(); }, show: !!onForward && !!textContent },
    { icon: Languages, label: t("chat.translate") || "Übersetzen", onClick: () => { onTranslate?.(); onClose(); }, show: !!canTranslate && !isMine },
    { icon: Pencil, label: t("chat.edit") || "Bearbeiten", onClick: () => { onEdit?.(); onClose(); }, show: !!canModify && !!onEdit },
    { icon: Trash2, label: t("chat.delete") || "Löschen", onClick: () => { onDelete?.(); onClose(); }, variant: "destructive", show: !!canModify && !!onDelete },
    { icon: Flag, label: t("chat.report") || "Melden", onClick: () => { onReport?.(); onClose(); }, variant: "destructive", show: !!onReport },
    { icon: Ban, label: t("chat.block") || "Blockieren", onClick: () => { onBlock?.(); onClose(); }, variant: "destructive", show: !!onBlock && !isMine },
  ].filter(a => a.show !== false);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />
      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] animate-in slide-in-from-bottom duration-200">
        <div className="mx-3 mb-3 rounded-2xl bg-card border border-border/50 shadow-2xl overflow-hidden">
          {/* Handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          
          <div className="px-1 pb-2">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors active:bg-muted/80",
                  action.variant === "destructive"
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                <action.icon className="w-5 h-5 shrink-0" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Cancel */}
          <div className="border-t border-border/50">
            <button
              onClick={onClose}
              className="w-full py-3.5 text-sm font-medium text-muted-foreground active:bg-muted/50"
            >
              {t("common.cancel") || "Abbrechen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MessageContextMenu;
