import { ArrowLeft, Building2 } from "lucide-react";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useI18n } from "@/contexts/I18nContext";

const ImpressumPage = () => {
  const { goBack, swipeHandlers } = useSmartBack("/settings");
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
          <h1 className="text-xl font-bold">Impressum</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Impressum</h2>
              <p className="text-xs text-muted-foreground">Angaben gemäß § 5 DDG</p>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up">
          <h3 className="font-semibold text-[0.938rem] mb-3">Verantwortlich</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p className="font-medium text-foreground">Clemens Schuth</p>
            <p>Ludwig-Erhard-Allee 3</p>
            <p>81739 München</p>
            <p>Deutschland</p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">Kontakt</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p>
              E-Mail:{" "}
              <a href="mailto:clemensschuth@outlook.de" className="text-primary font-medium hover:underline">
                clemensschuth@outlook.de
              </a>
            </p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">Haftungsausschluss</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>
              <strong>Haftung für Inhalte:</strong> Die Inhalte dieser App wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte übernehmen wir jedoch keine Gewähr. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte in dieser App nach den allgemeinen Gesetzen verantwortlich.
            </p>
            <p>
              <strong>Haftung für Links:</strong> Unsere App enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
            </p>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">Urheberrecht</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die durch den Betreiber erstellten Inhalte und Werke in dieser App unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors.
          </p>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">Streitschlichtung</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a href="https://ec.europa.eu/consumers/odr/" className="text-primary hover:underline" target="_blank" rel="noopener">
                ec.europa.eu/consumers/odr
              </a>
            </p>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default ImpressumPage;
