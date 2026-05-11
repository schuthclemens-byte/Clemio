import { Crown, Mic, Globe, Headphones, Sparkles, X, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useSubscription } from "@/hooks/useSubscription";

interface PaywallDialogProps {
  open: boolean;
  onClose: () => void;
}

const formatDate = (iso: string | null, locale: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const PaywallDialog = ({ open, onClose }: PaywallDialogProps) => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const {
    isPremium,
    isTrialActive,
    canStartTrial,
    hasUsedTrial,
    trialEndsAt,
    periodEnd,
    startTrial,
    trialStarting,
  } = useSubscription();
  const [activating, setActivating] = useState(false);

  if (!open) return null;

  const features = [
    { icon: Mic, label: t("paywall.featVoiceClone"), desc: t("paywall.featVoiceCloneDesc") },
    { icon: Globe, label: t("paywall.featTranslation"), desc: t("paywall.featTranslationDesc") },
    { icon: Headphones, label: t("paywall.featAutoPlay"), desc: t("paywall.featAutoPlayDesc") },
    { icon: Sparkles, label: t("paywall.featPremiumVoices"), desc: t("paywall.featPremiumVoicesDesc") },
  ];

  const handleStartTrial = async () => {
    const result = await startTrial();
    if (!result.ok) {
      if (result.error === "phone_required_for_trial") toast.error(t("paywall.errorPhoneRequired"));
      else if (result.error === "trial_already_used") toast.error(t("paywall.errorAlreadyUsed"));
      else toast.error(t("paywall.errorAlreadyUsed"));
      return;
    }
    toast.success(t("paywall.statusActive"));
    onClose();
  };

  const handleActivatePremium = async () => {
    // IAP integration pending — placeholder
    setActivating(true);
    toast.info("In-App-Kauf wird vorbereitet…");
    setTimeout(() => setActivating(false), 1500);
  };

  // Determine button state
  const renderCTA = () => {
    if (isPremium && !isTrialActive) {
      // State 4: Premium active
      return (
        <div className="w-full">
          <div className="w-full h-14 rounded-2xl bg-primary/15 text-primary font-bold text-base flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            {t("paywall.statusActive")}
          </div>
          {periodEnd && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              {t("paywall.renewsOn").replace("{date}", formatDate(periodEnd, locale))}
            </p>
          )}
        </div>
      );
    }

    if (isTrialActive) {
      // State 2: Trial active
      return (
        <div className="w-full h-14 rounded-2xl bg-primary/15 text-primary font-semibold text-sm flex items-center justify-center px-4 text-center">
          {t("paywall.ctaTrialActive").replace("{date}", formatDate(trialEndsAt, locale))}
        </div>
      );
    }

    if (canStartTrial) {
      // State 1: Eligible for trial
      return (
        <button
          onClick={handleStartTrial}
          disabled={trialStarting}
          className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {trialStarting && <Loader2 className="w-4 h-4 animate-spin" />}
          {trialStarting ? t("paywall.starting") : t("paywall.cta")}
        </button>
      );
    }

    // State 3: Trial used, no premium
    return (
      <div className="w-full">
        <button
          onClick={handleActivatePremium}
          disabled={activating}
          className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {activating && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("paywall.ctaActivate")}
        </button>
        {hasUsedTrial && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            {t("paywall.alreadyUsedHint")}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated overflow-hidden animate-reveal-up max-h-[80dvh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="pt-10 pb-6 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-soft">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("paywall.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("paywall.subtitle")}</p>
        </div>

        <div className="px-6 space-y-3 pb-6">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
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

        <div className="px-6 pb-3">
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <p className="text-lg font-bold">
              {t("paywall.price")}
              <span className="text-sm font-normal text-muted-foreground">{t("paywall.perMonth")}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("paywall.trialNote")}</p>
            <p className="text-[11px] text-muted-foreground/80 mt-2">{t("paywall.autoRenewNote")}</p>
          </div>
        </div>

        <div className="px-6 pb-4">{renderCTA()}</div>

        <div className="px-6 pb-6 space-y-2">
          <p className="text-center text-xs text-muted-foreground">{t("paywall.legal")}</p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <button onClick={() => { onClose(); navigate("/privacy"); }} className="text-primary hover:underline">
              {t("paywall.privacyLink")}
            </button>
            <span className="text-border">|</span>
            <button onClick={() => { onClose(); navigate("/terms"); }} className="text-primary hover:underline">
              {t("paywall.termsLink")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallDialog;
