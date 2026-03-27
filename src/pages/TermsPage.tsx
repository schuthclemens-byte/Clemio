import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const TermsPage = () => {
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
          <h1 className="text-xl font-bold">{t("legal.termsTitle")}</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("legal.termsTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("legal.termsUpdated")}</p>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up">
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.terms1Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("legal.terms1Text")}
          </p>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.terms2Title")}</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>{t("legal.terms2Intro")}</p>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.terms2Item1")}</li>
              <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.terms2Item2")}</li>
              <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.terms2Item3")}</li>
            </ul>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.terms3Title")}</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>{t("legal.terms3Intro")}</p>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.terms3Item1")}</li>
              <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.terms3Item2")}</li>
              <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.terms3Item3")}</li>
              <li className="flex gap-2"><span className="text-primary">•</span>{t("legal.terms3Item4")}</li>
            </ul>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.terms4Title")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-destructive">✗</span>{t("legal.terms4Item1")}</li>
            <li className="flex gap-2"><span className="text-destructive">✗</span>{t("legal.terms4Item2")}</li>
            <li className="flex gap-2"><span className="text-destructive">✗</span>{t("legal.terms4Item3")}</li>
            <li className="flex gap-2"><span className="text-destructive">✗</span>{t("legal.terms4Item4")}</li>
          </ul>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.terms5Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("legal.terms5Text")}{" "}
            <a href="mailto:support@clemio.app" className="text-primary font-medium hover:underline">
              support@clemio.app
            </a>
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default TermsPage;
