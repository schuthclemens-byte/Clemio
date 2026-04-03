import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const Section = ({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) => (
  <section
    className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <h3 className="font-semibold text-[0.938rem] mb-3">{title}</h3>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
  </section>
);

const Bullet = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
  <li className="flex gap-2">
    <span className={accent ? "text-accent" : "text-primary"}>•</span>
    <span>{children}</span>
  </li>
);

const Forbidden = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2">
    <span className="text-destructive">✗</span>
    <span>{children}</span>
  </li>
);

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
          <h1 className="text-xl font-bold">Nutzungsbedingungen</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nutzungsbedingungen – Clemio</h2>
              <p className="text-xs text-muted-foreground">Zuletzt aktualisiert: April 2026</p>
            </div>
          </div>
        </section>

        {/* 1. Geltungsbereich */}
        <Section title="1. Geltungsbereich" delay={0}>
          <p>
            Diese Nutzungsbedingungen gelten für die Nutzung der Clemio-App und aller damit verbundenen Dienste. Mit der Registrierung und Nutzung akzeptierst du diese Bedingungen.
          </p>
          <p>
            Betreiber: Clemens Schuth (Privatperson), München, Deutschland.
          </p>
        </Section>

        {/* 2. Nutzung der App */}
        <Section title="2. Nutzung der App" delay={60}>
          <p>
            Clemio ist eine Kommunikations-App mit Chat-, Anruf- und Voice-Funktionen. Die App ermöglicht:
          </p>
          <ul className="space-y-1">
            <Bullet>Senden und Empfangen von Text-, Sprach- und Bildnachrichten</Bullet>
            <Bullet>Audio- und Videoanrufe über WebRTC</Bullet>
            <Bullet>Klonen und Wiedergabe von Stimmen (Voice-Cloning)</Bullet>
            <Bullet>Echtzeit-Übersetzung von Nachrichten</Bullet>
            <Bullet>Push-Benachrichtigungen</Bullet>
          </ul>
          <p>
            Du musst mindestens <strong>16 Jahre alt</strong> sein, um Clemio zu nutzen. Du bist für dein Konto, dein Passwort und alle Aktivitäten unter deinem Konto verantwortlich.
          </p>
        </Section>

        {/* 3. Registrierung & Konto */}
        <Section title="3. Registrierung & Konto" delay={120}>
          <p>Für die Nutzung ist eine Registrierung mit Telefonnummer und Passwort erforderlich. Du verpflichtest dich:</p>
          <ul className="space-y-1">
            <Bullet>Wahrheitsgemäße Angaben bei der Registrierung zu machen</Bullet>
            <Bullet>Dein Passwort vertraulich zu behandeln</Bullet>
            <Bullet>Unbefugte Nutzung deines Kontos unverzüglich zu melden</Bullet>
          </ul>
          <p>
            Du kannst deinen Anzeigenamen, Vor- und Nachnamen sowie dein Profilbild jederzeit ändern. Die Telefonnummer dient als eindeutige Identifikation und kann nicht geändert werden.
          </p>
        </Section>

        {/* 4. Voice-Cloning */}
        <Section title="4. Voice-Cloning & Stimmfreigaben" delay={180}>
          <p>Das Voice-Cloning ist eine optionale Premium-Funktion. Durch die Nutzung bestätigst du:</p>
          <ul className="space-y-1">
            <Bullet accent>Du bist die Person in der Sprachaufnahme oder hast deren ausdrückliche Genehmigung</Bullet>
            <Bullet accent>Du nutzt die Funktion nicht für Täuschung, Betrug oder illegale Zwecke</Bullet>
            <Bullet accent>Du akzeptierst, dass Empfänger erkennen können, dass es sich um eine synthetische Stimme handelt</Bullet>
          </ul>
          <p className="font-medium text-foreground">Consent-System (Stimmfreigaben):</p>
          <p>
            Andere Nutzer können deine geklonte Stimme nur verwenden, wenn du ihnen über das integrierte Consent-System eine Freigabe erteilst. Du kannst Freigaben jederzeit erteilen, ablehnen oder widerrufen. Eigenstimm-Anfragen an dich selbst sind nicht möglich, und pro Nutzer-Paar ist nur eine Anfrage erlaubt.
          </p>
          <p>
            Du kannst außerdem eigene Kontakt-Stimmprofile für deine Kontakte erstellen, die nur für dich sichtbar sind.
          </p>
        </Section>

        {/* 5. Abonnement */}
        <Section title="5. Abonnement & Zahlungen" delay={240}>
          <p>Clemio bietet kostenlose und Premium-Funktionen:</p>
          <ul className="space-y-1">
            <Bullet>7 Tage kostenlose Testphase für alle neuen Nutzer (60 Tage für Founding User)</Bullet>
            <Bullet>Premium: 4,99 €/Monat, verlängert sich automatisch</Bullet>
            <Bullet>Kündigung jederzeit möglich, wirksam zum Ende des Abrechnungszeitraums</Bullet>
            <Bullet>Zahlungen werden über Stripe abgewickelt</Bullet>
          </ul>
          <p>
            Es gelten die Zahlungsbedingungen von Stripe. Clemio speichert keine Kreditkartendaten.
          </p>
        </Section>

        {/* 6. Privatsphäre-Einstellungen */}
        <Section title="6. Privatsphäre-Einstellungen" delay={300}>
          <p>Du kannst folgende Privatsphäre-Optionen individuell konfigurieren:</p>
          <ul className="space-y-1">
            <Bullet>Lesebestätigungen (blaue Häkchen) ein-/ausschalten</Bullet>
            <Bullet>Online-Status und Tipp-Anzeige aktivieren/deaktivieren</Bullet>
            <Bullet>Push-Nachrichtenvorschau ein-/ausschalten</Bullet>
            <Bullet>Fokus-Modus mit ausgewählten Kontakten aktivieren</Bullet>
          </ul>
          <p>
            Diese Einstellungen gelten für alle deine Kontakte gleichermaßen.
          </p>
        </Section>

        {/* 7. Verbotene Nutzung */}
        <Section title="7. Verbotene Nutzung" delay={360}>
          <p>Folgende Handlungen sind ausdrücklich untersagt:</p>
          <ul className="space-y-2">
            <Forbidden>Stimmen anderer Personen ohne deren ausdrückliche Zustimmung klonen</Forbidden>
            <Forbidden>Irreführende, betrügerische oder rechtswidrige Inhalte erstellen oder verbreiten</Forbidden>
            <Forbidden>Die App für Spam, Belästigung, Stalking oder illegale Aktivitäten nutzen</Forbidden>
            <Forbidden>Sicherheitsmechanismen der App umgehen oder manipulieren</Forbidden>
            <Forbidden>Automatisierte Zugriffe (Bots, Scraping) auf die App durchführen</Forbidden>
            <Forbidden>Falsche Identitäten vortäuschen oder andere Nutzer nachahmen</Forbidden>
          </ul>
          <p>
            Verstöße können zur sofortigen Sperrung deines Kontos führen.
          </p>
        </Section>

        {/* 8. Inhalte & Kommunikation */}
        <Section title="8. Inhalte & Kommunikation" delay={420}>
          <p>
            Du bist allein verantwortlich für die Inhalte, die du über Clemio teilst (Nachrichten, Medien, Stimmproben). Clemio übernimmt keine Haftung für nutzergenerierte Inhalte.
          </p>
          <p>
            Nachrichten werden serverseitig gespeichert und mit Transportverschlüsselung (TLS) übertragen. Es findet keine Ende-zu-Ende-Verschlüsselung statt.
          </p>
        </Section>

        {/* 9. Kontolöschung */}
        <Section title="9. Kontolöschung" delay={480}>
          <p>
            Du kannst dein Konto jederzeit in den Profileinstellungen vollständig löschen. Bei der Löschung werden unwiderruflich entfernt:
          </p>
          <ul className="space-y-1">
            <Bullet>Alle Nachrichten und Medien</Bullet>
            <Bullet>Stimmprofile (auch bei ElevenLabs)</Bullet>
            <Bullet>Kontakt-Einstellungen und Stimmfreigaben</Bullet>
            <Bullet>Push-Subscriptions und Präsenzdaten</Bullet>
            <Bullet>Profildaten und Authentifizierung</Bullet>
          </ul>
          <p className="font-medium text-foreground">
            Eine Wiederherstellung ist nach der Löschung nicht möglich.
          </p>
        </Section>

        {/* 10. Verfügbarkeit */}
        <Section title="10. Verfügbarkeit & Haftung" delay={540}>
          <p>
            Clemio wird als Progressive Web App (PWA) bereitgestellt. Eine durchgehende Verfügbarkeit wird nicht garantiert. Wartungsarbeiten, technische Störungen oder externe Faktoren können die Nutzung temporär einschränken.
          </p>
          <p>
            Clemio haftet nicht für:
          </p>
          <ul className="space-y-1">
            <Bullet>Datenverluste durch technische Störungen oder Gerätedefekte</Bullet>
            <Bullet>Missbrauch durch andere Nutzer</Bullet>
            <Bullet>Ausfälle externer Dienste (Supabase, ElevenLabs, Stripe, Google, Apple)</Bullet>
            <Bullet>Inhalte, die von Nutzern erstellt oder geteilt werden</Bullet>
          </ul>
        </Section>

        {/* 11. Änderungen */}
        <Section title="11. Änderungen der Nutzungsbedingungen" delay={600}>
          <p>
            Wir behalten uns vor, diese Nutzungsbedingungen jederzeit zu ändern. Wesentliche Änderungen werden über die App kommuniziert. Die fortgesetzte Nutzung nach einer Änderung gilt als Zustimmung.
          </p>
        </Section>

        {/* 12. Anwendbares Recht */}
        <Section title="12. Anwendbares Recht" delay={660}>
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist München, soweit gesetzlich zulässig.
          </p>
        </Section>

        {/* Kontakt */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "720ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">Kontakt</h3>
          <p className="text-sm text-muted-foreground">
            Bei Fragen zu diesen Nutzungsbedingungen erreichst du uns unter:{" "}
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
