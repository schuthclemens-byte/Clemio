import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Nutzungsbedingungen</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nutzungsbedingungen</h2>
              <p className="text-xs text-muted-foreground">Zuletzt aktualisiert: März 2026</p>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up">
          <h3 className="font-semibold text-[0.938rem] mb-3">1. Nutzung der App</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Voxa ist eine Kommunikations-App, die Nachrichten als Sprache wiedergibt. 
            Du musst mindestens 16 Jahre alt sein, um Voxa zu nutzen.
            Du bist für dein Konto und alle Aktivitäten verantwortlich.
          </p>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">2. Stimmen-Klonen</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>Das Stimmen-Klonen ist eine optionale Funktion. Durch die Nutzung bestätigst du:</p>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-primary">•</span>Du bist die Person in der Sprachaufnahme oder hast deren ausdrückliche Genehmigung</li>
              <li className="flex gap-2"><span className="text-primary">•</span>Du nutzt die Funktion nicht für Täuschung, Betrug oder illegale Zwecke</li>
              <li className="flex gap-2"><span className="text-primary">•</span>Du akzeptierst, dass Empfänger klar erkennen können, dass es sich um eine synthetische Stimme handelt</li>
            </ul>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">3. Abonnement</h3>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>Voxa bietet kostenlose und Premium-Funktionen:</p>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-primary">•</span>7 Tage kostenlose Testphase für alle neuen Nutzer</li>
              <li className="flex gap-2"><span className="text-primary">•</span>Premium: 4,99 €/Monat, verlängert sich automatisch</li>
              <li className="flex gap-2"><span className="text-primary">•</span>Kündigung jederzeit möglich, wirksam zum Ende des Abrechnungszeitraums</li>
              <li className="flex gap-2"><span className="text-primary">•</span>Käufe können über den jeweiligen App Store wiederhergestellt werden</li>
            </ul>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">4. Verbotene Nutzung</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-destructive">✗</span>Stimmen anderer Personen ohne deren Zustimmung klonen</li>
            <li className="flex gap-2"><span className="text-destructive">✗</span>Irreführende oder betrügerische Inhalte erstellen</li>
            <li className="flex gap-2"><span className="text-destructive">✗</span>Die App für Spam, Belästigung oder illegale Aktivitäten nutzen</li>
            <li className="flex gap-2"><span className="text-destructive">✗</span>Die Sicherheitsmechanismen der App umgehen</li>
          </ul>
        </section>

        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">5. Kontakt</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bei Fragen erreichst du uns unter:{" "}
            <a href="mailto:support@voxa.app" className="text-primary font-medium hover:underline">
              support@voxa.app
            </a>
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default TermsPage;
