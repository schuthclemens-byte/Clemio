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

        {/* 1. Verantwortlicher */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up">
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv1Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {t("legal.priv1Text")}
          </p>
        </section>

        {/* 2. Verarbeitete Daten */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv2Title")}</h3>
          <p className="text-sm text-muted-foreground mb-3">{t("legal.priv2Intro")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv2Account")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv2Messages")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv2Voice")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv2Payment")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv2Usage")}</li>
          </ul>
        </section>

        {/* 3. Zwecke */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv3Title")}</h3>
          <p className="text-sm text-muted-foreground mb-3">{t("legal.priv3Intro")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv3Item1")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv3Item2")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv3Item3")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv3Item4")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv3Item5")}</li>
          </ul>
        </section>

        {/* 4. Externe Dienste */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv4Title")}</h3>
          <p className="text-sm text-muted-foreground mb-3">{t("legal.priv4Intro")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv4Item1")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv4Item2")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv4Item3")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv4Item4")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv4Item5")}</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3 italic">{t("legal.priv4Note")}</p>
        </section>

        {/* 5. Drittländer */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv5Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.priv5Text")}</p>
        </section>

        {/* 6. Rechtsgrundlagen */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "300ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv6Title")}</h3>
          <p className="text-sm text-muted-foreground mb-3">{t("legal.priv6Intro")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv6Item1")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv6Item2")}</li>
            <li className="flex gap-2"><span className="text-accent">•</span>{t("legal.priv6Item3")}</li>
          </ul>
        </section>

        {/* 7. Speicherdauer */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "360ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv7Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.priv7Text")}</p>
        </section>

        {/* 8. Rechte */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "420ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv8Title")}</h3>
          <p className="text-sm text-muted-foreground mb-3">{t("legal.priv8Intro")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv8Item1")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv8Item2")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv8Item3")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv8Item4")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv8Item5")}</li>
            <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.priv8Item6")}</li>
          </ul>
        </section>

        {/* 9. Sicherheit */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "480ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.priv9Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.priv9Text")}</p>
        </section>

        {/* Datenlöschung */}
        <section className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 animate-reveal-up" style={{ animationDelay: "540ms" }}>
          <p className="text-sm text-foreground leading-relaxed">{t("legal.privDeletion")}</p>
        </section>

        {/* Kontakt */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "600ms" }}>
          <p className="text-sm text-muted-foreground">
            Kontakt:{" "}
            <a href="mailto:privacy@clevara.app" className="text-primary font-medium hover:underline">
              privacy@clevara.app
            </a>
          </p>
        </section>

        <section className="animate-reveal-up" style={{ animationDelay: "660ms" }}>
          <div className="bg-accent/5 border border-accent/10 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-foreground">{t("legal.privTrust")}</p>
          </div>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
