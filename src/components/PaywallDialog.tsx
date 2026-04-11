import { Crown, Mic, Globe, Headphones, Sparkles, X, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface PaywallDialogProps {
  open: boolean;
  onClose: () => void;
}

const PaywallDialog = ({ open, onClose }: PaywallDialogProps) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  if (!open) return null;

  const features = [
    { icon: Mic, label: t("paywall.featVoiceClone"), desc: t("paywall.featVoiceCloneDesc") },
    { icon: Globe, label: t("paywall.featTranslation"), desc: t("paywall.featTranslationDesc") },
    { icon: Headphones, label: t("paywall.featAutoPlay"), desc: t("paywall.featAutoPlayDesc") },
    { icon: Sparkles, label: t("paywall.featPremiumVoices"), desc: t("paywall.featPremiumVoicesDesc") },
  ];

  const handleRestore = () => {
    alert(t("paywall.restoring"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated overflow-hidden animate-reveal-up">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="pt-10 pb-6 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-soft">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("paywall.title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("paywall.subtitle")}
          </p>
        </div>

        {/* Features */}
        <div className="px-6 space-y-3 pb-6">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="px-6 pb-3">
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <p className="text-lg font-bold">{t("paywall.price")}<span className="text-sm font-normal text-muted-foreground">{t("paywall.perMonth")}</span></p>
            <p className="text-xs text-muted-foreground mt-1">{t("paywall.trialNote")}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-3">
          <button
            onClick={onClose}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all active:scale-[0.97]"
          >
            {t("paywall.cta")}
          </button>
        </div>

        {/* Restore */}
        <div className="px-6 pb-3">
          <button
            onClick={handleRestore}
            className="w-full h-11 rounded-xl bg-secondary/50 text-muted-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary transition-colors active:scale-[0.97]"
          >
            <RotateCcw className="w-4 h-4" />
            {t("paywall.restore")}
          </button>
        </div>

        {/* Legal */}
        <div className="px-6 pb-6 space-y-2">
          <p className="text-center text-xs text-muted-foreground">
            {t("paywall.legal")}
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              onClick={() => { onClose(); navigate("/privacy"); }}
              className="text-primary hover:underline"
            >
              {t("paywall.privacyLink")}
            </button>
            <span className="text-border">|</span>
            <button
              onClick={() => { onClose(); navigate("/terms"); }}
              className="text-primary hover:underline"
            >
              {t("paywall.termsLink")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallDialog;
