import { ShieldCheck, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface VoiceConsentPopupProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

const VoiceConsentPopup = ({ open, onAccept, onCancel }: VoiceConsentPopupProps) => {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ touchAction: "none" }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated animate-reveal-up flex flex-col" style={{ maxHeight: "90dvh" } as React.CSSProperties}>
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" } as React.CSSProperties}>
          {/* Header */}
          <div className="pt-10 pb-4 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t("consent.title")}</h2>
          </div>

          {/* Content */}
          <div className="px-6 pb-4 space-y-4">
            <div className="bg-secondary/50 rounded-xl p-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>{t("consent.voluntary")}</p>
              <p>{t("consent.usage")}</p>
              <p>{t("consent.revoke")}</p>
            </div>

            {/* Trust line */}
            <div className="flex items-center gap-2 px-1">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs text-muted-foreground">
                {t("consent.trust")}
              </p>
            </div>
          </div>
        </div>

        {/* Buttons – always visible at bottom */}
        <div className="px-6 pb-6 pt-2 space-y-3 shrink-0 border-t border-border/30">
          <button
            onClick={onAccept}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all active:scale-[0.97]"
          >
            {t("consent.accept")}
          </button>
          <button
            onClick={onCancel}
            className="w-full h-11 rounded-xl bg-secondary/50 text-muted-foreground text-sm font-medium hover:bg-secondary transition-colors active:scale-[0.97]"
          >
            {t("consent.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceConsentPopup;
