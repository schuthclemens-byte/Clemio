import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label={t("legal.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("legal.privTitle")}</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("legal.privFullTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("legal.privUpdated")}</p>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up">
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv1Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("legal.priv1Text")}
          </p>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv2Title")}</h3>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <div className="flex gap-2"><span className="text-primary">•</span><p><strong className="text-foreground">{t("legal.priv2Account")}</strong></p></div>
            <div className="flex gap-2"><span className="text-primary">•</span><p><strong className="text-foreground">{t("legal.priv2Messages")}</strong></p></div>
            <div className="flex gap-2"><span className="text-primary">•</span><p><strong className="text-foreground">{t("legal.priv2Voice")}</strong></p></div>
            <div className="flex gap-2"><span className="text-primary">•</span><p><strong className="text-foreground">{t("legal.priv2Usage")}</strong></p></div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            {t("legal.priv2Note")}
          </p>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv3Title")}</h3>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>{t("legal.priv3Intro")}</p>
            <ul className="space-y-2">
              <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv3Item1")}</li>
              <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv3Item2")}</li>
            </ul>
            <div className="bg-primary/5 rounded-xl p-4 mt-3 space-y-2">
              <p className="font-semibold text-foreground text-sm">⚠️ {t("legal.priv3Important")}</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("legal.priv3Consent")}</li>
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("legal.priv3Delete")}</li>
                <li className="flex gap-2"><span className="text-accent">✓</span>{t("legal.priv3NoConsent")}</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              {t("legal.priv3Note")}
            </p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv4Title")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv4Item1")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv4Item2")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv4Item3")}</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            {t("legal.priv4Note")}
          </p>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv5Title")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-accent">✓</span>{t("legal.priv5Item1")}</li>
            <li className="flex gap-2"><span className="text-accent">✓</span>{t("legal.priv5Item2")}</li>
            <li className="flex gap-2"><span className="text-accent">✓</span>{t("legal.priv5Item3")}</li>
          </ul>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "300ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv6Title")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv6Item1")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv6Item2")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv6Item3")}</li>
          </ul>
          <div className="bg-primary/5 rounded-xl p-3 mt-3">
            <p className="text-sm text-foreground font-medium">
              ➡️ {t("legal.priv6Hint")}
            </p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "360ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv7Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("legal.priv7Text")}
          </p>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "420ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv8Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("legal.priv8Text")}{" "}
            <a href="mailto:privacy@clevara.app" className="text-primary font-medium hover:underline">
              privacy@clevara.app
            </a>
          </p>
        </section>

        <section className="animate-reveal-up" style={{ animationDelay: "480ms" }}>
          <div className="bg-accent/5 border border-accent/10 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("legal.privTrust")}
            </p>
          </div>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
