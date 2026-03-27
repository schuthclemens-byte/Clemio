import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";

const ONBOARDING_KEY = "clemio_onboarding_done";

const OnboardingPage = () => {
  const [selected, setSelected] = useState<"simple" | "private" | null>(null);
  const navigate = useNavigate();
  const { t } = useI18n();
  const a11y = useAccessibility();

  const finish = (mode: "simple" | "private") => {
    // Apply privacy settings based on choice
    if (mode === "private") {
      // Private mode: disable previews, read receipts, online status, typing
      if (a11y.showOnlineStatus) a11y.toggle("showOnlineStatus");
      if (a11y.showTypingIndicator) a11y.toggle("showTypingIndicator");
      localStorage.setItem("clemio_push_preview", "false");
      localStorage.setItem("clemio_read_receipts", "false");
    } else {
      // Simple mode: enable everything
      if (!a11y.showOnlineStatus) a11y.toggle("showOnlineStatus");
      if (!a11y.showTypingIndicator) a11y.toggle("showTypingIndicator");
      localStorage.setItem("clemio_push_preview", "true");
      localStorage.setItem("clemio_read_receipts", "true");
    }

    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-center mb-2">
          {t("onboarding.chooseTitle") || "Wie möchtest du starten?"}
        </h1>
        <p className="text-muted-foreground text-center text-sm max-w-xs mb-12">
          {t("onboarding.chooseDesc") || "Du kannst das jederzeit in den Einstellungen ändern."}
        </p>

        {/* Two cards */}
        <div className="w-full max-w-sm space-y-4">
          {/* Simple */}
          <button
            onClick={() => setSelected("simple")}
            className={cn(
              "w-full flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left",
              "hover:border-primary/40 active:scale-[0.98]",
              selected === "simple"
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border bg-card"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              selected === "simple" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-base mb-1">
                {t("onboarding.simpleTitle") || "Einfach"}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("onboarding.simpleDesc") || "Nachrichtenvorschau, Lesebestätigungen und Online-Status sind aktiv."}
              </p>
            </div>
          </button>

          {/* Private */}
          <button
            onClick={() => setSelected("private")}
            className={cn(
              "w-full flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left",
              "hover:border-primary/40 active:scale-[0.98]",
              selected === "private"
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border bg-card"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              selected === "private" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-base mb-1">
                {t("onboarding.privateTitle") || "Privat"}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("onboarding.privateDesc") || "Keine Vorschau, keine Lesebestätigungen, weniger Sichtbarkeit."}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-12">
        <button
          onClick={() => selected && finish(selected)}
          disabled={!selected}
          className={cn(
            "w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center transition-all duration-200",
            selected
              ? "gradient-primary text-primary-foreground shadow-soft active:scale-[0.97]"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {t("onboarding.start") || "Los geht's"}
        </button>
      </div>
    </div>
  );
};

export { ONBOARDING_KEY };
export default OnboardingPage;
