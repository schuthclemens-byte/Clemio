import { useEffect } from "react";
import { ShieldCheck, Lock, Trash2, Ban } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface VoiceConsentPopupProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

const VoiceConsentPopup = ({ open, onAccept, onCancel }: VoiceConsentPopupProps) => {
  const { t } = useI18n();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  const points = [
    { icon: Lock, text: t("consent.point1") },
    { icon: Trash2, text: t("consent.point2") },
    { icon: Ban, text: t("consent.point3") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-elevated animate-reveal-up">
        {/* Header */}
        <div className="pt-8 pb-2 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-accent" />
          </div>
          <h2 className="text-lg font-bold">{t("consent.title")}</h2>
        </div>

        {/* Bullet points */}
        <div className="px-6 py-4 space-y-3">
          {points.map((point, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <point.icon className="w-4 h-4 text-accent" />
              </div>
              <p className="text-sm text-foreground leading-snug">{point.text}</p>
            </div>
          ))}
        </div>

        {/* Trust line */}
        <div className="px-6 pb-2">
          <p className="text-xs text-muted-foreground text-center">{t("consent.trust")}</p>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 pt-3 space-y-2">
          <button
            onClick={onAccept}
            className="w-full h-13 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all active:scale-[0.97]"
          >
            {t("consent.accept")}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            {t("consent.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceConsentPopup;
