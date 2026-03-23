import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const ImpressumPage = () => {
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
          <h1 className="text-xl font-bold">{t("legal.impTitle")}</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("legal.impTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("legal.impSubtitle")}</p>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up">
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.impResponsible")}</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p className="font-medium text-foreground">Clemens Schuth</p>
            <p>Ludwig-Erhard-Allee 3</p>
            <p>81739 München</p>
            <p>Deutschland</p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.impContact")}</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p>
              {t("legal.impEmail")}:{" "}
              <a href="mailto:clemensschuth@outlook.de" className="text-primary font-medium hover:underline">
                clemensschuth@outlook.de
              </a>
            </p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.impDisclaimer")}</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>{t("legal.impDisclaimerContent")}</p>
            <p>{t("legal.impDisclaimerLinks")}</p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.impCopyright")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("legal.impCopyrightText")}
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default ImpressumPage;
