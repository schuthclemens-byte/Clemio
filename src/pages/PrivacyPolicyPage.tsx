import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
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
          <h1 className="text-xl font-bold">Datenschutzerklärung</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Datenschutzerklärung – Clemio</h2>
              <p className="text-xs text-muted-foreground">Zuletzt aktualisiert: April 2026</p>
            </div>
          </div>
        </section>

        {/* 1. Verantwortlicher */}
        <Section title="1. Verantwortlicher" delay={0}>
          <p>
            Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <p className="whitespace-pre-line">
            {`Clemens Schuth (Privatperson)
München, Deutschland
E-Mail: privacy@clemio.app`}
          </p>
        </Section>

        {/* 2. Übersicht */}
        <Section title="2. Übersicht der Datenverarbeitung" delay={60}>
          <p>
            Clemio ist eine Messaging-App mit Chat-, Anruf- und Voice-Funktionen. Zur Bereitstellung dieser Dienste verarbeiten wir personenbezogene Daten. Diese Datenschutzerklärung informiert dich darüber, welche Daten wir erheben, zu welchem Zweck und auf welcher Rechtsgrundlage.
          </p>
          <p className="font-medium text-foreground">Wir setzen keine Analytics- oder Tracking-Tools ein.</p>
        </Section>

        {/* 3. Kontodaten */}
        <Section title="3. Kontodaten & Registrierung" delay={120}>
          <p>Bei der Registrierung erheben wir:</p>
          <ul className="space-y-1">
            <Bullet>Telefonnummer (zur Identifikation und Anmeldung)</Bullet>
            <Bullet>Anzeigename (frei wählbar)</Bullet>
            <Bullet>Vor- und Nachname (optional)</Bullet>
            <Bullet>Profilbild (optional, wird serverseitig gespeichert)</Bullet>
            <Bullet>Passwort (wird gehasht gespeichert, niemals im Klartext)</Bullet>
            <Bullet>Spracheinstellung der App</Bullet>
          </ul>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).</p>
        </Section>

        {/* 4. Nachrichten */}
        <Section title="4. Nachrichten & Medien" delay={180}>
          <p>Wir speichern folgende Kommunikationsdaten:</p>
          <ul className="space-y-1">
            <Bullet>Textnachrichten und deren Inhalte</Bullet>
            <Bullet>Sprachnachrichten (Audiodateien)</Bullet>
            <Bullet>Bilder und Videos, die über den Chat geteilt werden</Bullet>
            <Bullet>Zeitstempel, Lese-Status und Zuordnung zu Gesprächen</Bullet>
            <Bullet>Emoji-Reaktionen auf Nachrichten</Bullet>
            <Bullet>Antwort-Referenzen (Reply-to) auf andere Nachrichten</Bullet>
          </ul>
          <p>
            Medien werden im Cloud-Speicher unseres Backend-Anbieters (siehe Abschnitt 9) gespeichert. Der Zugriff auf Chat-Medien erfolgt über zeitlich begrenzte, signierte URLs. Nachrichten werden nicht Ende-zu-Ende-verschlüsselt, sondern mit Transport-Verschlüsselung (TLS) übertragen und serverseitig gespeichert.
          </p>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).</p>
        </Section>

        {/* 5. Kontaktverwaltung */}
        <Section title="5. Kontaktverwaltung & Einstellungen" delay={220}>
          <p>Zur Personalisierung deiner Kontakte speichern wir folgende Daten:</p>
          <ul className="space-y-1">
            <Bullet><strong>Kontakt-Aliase:</strong> Du kannst für andere Nutzer eigene Vor- und Nachnamen vergeben. Diese sind nur für dich sichtbar.</Bullet>
            <Bullet><strong>Autoplay-Einstellungen:</strong> Pro Kontakt kann festgelegt werden, ob Sprachnachrichten automatisch abgespielt werden.</Bullet>
            <Bullet><strong>Fokus-Modus:</strong> Du kannst eine Liste von Fokus-Kontakten pflegen, um Benachrichtigungen auf bestimmte Personen einzuschränken.</Bullet>
            <Bullet><strong>Chat-Einladungen:</strong> Beim Erstellen neuer Chats wird eine Einladung an den anderen Nutzer gesendet, die angenommen oder abgelehnt werden kann.</Bullet>
          </ul>
          <p>Alle diese Daten werden ausschließlich deinem Nutzerkonto zugeordnet und sind für andere Nutzer nicht einsehbar.</p>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).</p>
        </Section>

        {/* 6. Anrufe */}
        <Section title="6. Audio- und Videoanrufe (WebRTC)" delay={260}>
          <p>
            Für Audio- und Videoanrufe nutzt Clemio die WebRTC-Technologie. Dabei werden Audio- und Videodaten direkt zwischen den Geräten der Teilnehmer übertragen (Peer-to-Peer). Die Inhalte der Gespräche werden nicht auf unseren Servern gespeichert.
          </p>
          <p className="font-medium text-foreground">Folgende Daten werden gespeichert:</p>
          <ul className="space-y-1">
            <Bullet>Anrufer und Empfänger (Nutzer-IDs)</Bullet>
            <Bullet>Anruftyp (Audio/Video)</Bullet>
            <Bullet>Zeitpunkt des Anrufs, Annahme, Beendigung</Bullet>
            <Bullet>Status (angenommen, verpasst, abgelehnt)</Bullet>
          </ul>
          <p className="font-medium text-foreground mt-2">Für den Verbindungsaufbau werden externe Server genutzt:</p>

          <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
            <p><strong>Google STUN-Server</strong></p>
            <p>Adresse: stun:stun.l.google.com:19302</p>
            <p>Zweck: Ermittlung der öffentlichen IP-Adresse deines Geräts, um eine direkte Verbindung zwischen Anrufern herzustellen.</p>
            <p>Übertragene Daten: IP-Adresse, Netzwerk-Informationen.</p>
            <p>Anbieter: Google LLC, USA.</p>
            <p>Datenschutz: <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">policies.google.com/privacy</a></p>
          </div>

          <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
            <p><strong>Metered.ca TURN-Server</strong></p>
            <p>Adresse: turn:a.relay.metered.ca</p>
            <p>Zweck: Wenn eine direkte Verbindung nicht möglich ist (z. B. durch Firewalls), werden Audio-/Videodaten über diesen Relay-Server weitergeleitet.</p>
            <p>Übertragene Daten: IP-Adresse, verschlüsselte Audio-/Videodaten.</p>
            <p>Anbieter: Metered Video Inc., Kanada.</p>
            <p>Datenschutz: <a href="https://www.metered.ca/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">metered.ca/privacy</a></p>
          </div>

          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO). Für die Nutzung externer Server: berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).</p>
        </Section>

        {/* 7. Online-Status & Präsenz */}
        <Section title="7. Online-Status & Präsenz" delay={300}>
          <p>
            Clemio zeigt an, ob ein Kontakt gerade online ist und wann er zuletzt aktiv war. Dafür speichern wir:
          </p>
          <ul className="space-y-1">
            <Bullet>Online-Status (online/offline)</Bullet>
            <Bullet>Zeitpunkt der letzten Aktivität</Bullet>
            <Bullet>Tipp-Anzeige („schreibt…") in aktiven Gesprächen</Bullet>
          </ul>
          <p>
            Diese Daten sind nur für Nutzer sichtbar, mit denen du in einem gemeinsamen Chat bist. Du kannst den Online-Status und die Tipp-Anzeige in den Privatsphäre-Einstellungen deaktivieren.
          </p>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).</p>
        </Section>

        {/* 8. Push */}
        <Section title="8. Push-Benachrichtigungen" delay={340}>
          <p>
            Wenn du Push-Benachrichtigungen aktivierst, nutzen wir die Web-Push-API (VAPID-Protokoll). Dabei werden folgende Daten gespeichert:
          </p>
          <ul className="space-y-1">
            <Bullet>Push-Endpoint-URL (vom Browser generiert)</Bullet>
            <Bullet>Kryptographische Schlüssel (p256dh, auth)</Bullet>
          </ul>
          <p>
            Du kannst in den Einstellungen festlegen, ob Push-Benachrichtigungen eine Nachrichtenvorschau anzeigen oder nur einen anonymen Hinweis.
          </p>
          <p>
            Die Zustellung erfolgt je nach Betriebssystem über:
          </p>
          <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
            <p><strong>Google Firebase Cloud Messaging (FCM)</strong> – für Android/Chrome</p>
            <p>Anbieter: Google LLC, USA</p>
            <p>Datenschutz: <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">policies.google.com/privacy</a></p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
            <p><strong>Apple Push Notification Service (APNs)</strong> – für iOS/Safari</p>
            <p>Anbieter: Apple Inc., USA</p>
            <p>Datenschutz: <a href="https://www.apple.com/legal/privacy/" className="text-primary hover:underline" target="_blank" rel="noopener">apple.com/legal/privacy</a></p>
          </div>
          <p>
            Die Nachrichteninhalte werden Ende-zu-Ende verschlüsselt an dein Gerät gesendet. Google und Apple können die Inhalte der Benachrichtigungen nicht lesen. Übertragen werden lediglich verschlüsselte Nutzlast und Routing-Informationen.
          </p>
          <p><strong>Rechtsgrundlage:</strong> Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst Push jederzeit in den App-Einstellungen deaktivieren.</p>
        </Section>

        {/* 9. Supabase */}
        <Section title="9. Backend & Datenbank (Supabase)" delay={380}>
          <p>
            Als Backend nutzt Clemio die Plattform <strong>Supabase</strong>. Supabase stellt folgende Dienste bereit:
          </p>
          <ul className="space-y-1">
            <Bullet><strong>Datenbank (PostgreSQL):</strong> Speicherung aller Nutzerdaten, Nachrichten, Kontakte, Anrufhistorie, Abonnements und Einstellungen.</Bullet>
            <Bullet><strong>Authentifizierung:</strong> Registrierung und Anmeldung mit Telefonnummer und Passwort. Passwörter werden gehasht gespeichert.</Bullet>
            <Bullet><strong>Dateispeicher (Storage):</strong> Speicherung von Profilbildern, Sprachnachrichten, geteilten Medien und Voice-Samples. Private Buckets werden durch signierte URLs geschützt.</Bullet>
            <Bullet><strong>Realtime:</strong> Echtzeit-Synchronisation von Nachrichten, Tipp-Anzeigen und Online-Status.</Bullet>
            <Bullet><strong>Edge Functions:</strong> Serverseitige Logik für Zahlungen, Push-Benachrichtigungen, Übersetzungen, Voice-Cloning und Kontolöschung.</Bullet>
          </ul>
          <p>
            Anbieter: Supabase Inc., San Francisco, USA.<br />
            Datenschutz: <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">supabase.com/privacy</a>
          </p>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO); Auftragsverarbeitung (Art. 28 DSGVO).</p>
        </Section>

        {/* 10. Hosting */}
        <Section title="10. Hosting" delay={420}>
          <p>
            Die Web-App wird über <strong>Lovable</strong> gehostet und bereitgestellt. Die Infrastruktur basiert auf Cloud-Diensten mit Servern in den USA und Europa.
          </p>
          <p>Beim Aufruf der App werden automatisch folgende Daten übermittelt:</p>
          <ul className="space-y-1">
            <Bullet>IP-Adresse</Bullet>
            <Bullet>Browsertyp und -version</Bullet>
            <Bullet>Betriebssystem</Bullet>
            <Bullet>Datum und Uhrzeit des Zugriffs</Bullet>
          </ul>
          <p>
            Anbieter: Lovable (GPT Engineer AB), Stockholm, Schweden.<br />
            Datenschutz: <a href="https://lovable.dev/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">lovable.dev/privacy</a>
          </p>
          <p><strong>Rechtsgrundlage:</strong> Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).</p>
        </Section>

        {/* 11. ElevenLabs – Besonders sensible Daten */}
        <section
          className="bg-card rounded-2xl shadow-sm border-2 border-primary/30 animate-reveal-up overflow-hidden"
          style={{ animationDelay: "460ms" }}
        >
          <div className="bg-primary/10 px-5 py-3 flex items-center gap-2">
            <span className="text-lg">🎤</span>
            <h3 className="font-semibold text-[0.938rem]">11. Voice-Cloning & Text-to-Speech (Besonders sensible Daten)</h3>
          </div>
          <div className="p-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p className="font-medium text-foreground">⚠️ Hinweis: Stimmdaten gelten als biometrische Daten im Sinne von Art. 9 DSGVO und unterliegen besonderem Schutz.</p>
            </div>
            <p>
              Clemio bietet die Möglichkeit, eine eigene Stimme zu klonen und Textnachrichten vorlesen zu lassen. Dafür nutzen wir den Dienst <strong>ElevenLabs</strong>.
            </p>
            <p className="font-medium text-foreground">Verarbeitete Daten:</p>
            <ul className="space-y-1">
              <Bullet>Stimmproben (Audio-Aufnahmen deiner Stimme)</Bullet>
              <Bullet>Textnachrichten (zur Umwandlung in Sprache)</Bullet>
              <Bullet>Generierte Stimmprofile (Voice-IDs bei ElevenLabs)</Bullet>
              <Bullet>Kontakt-Stimmprofile (du kannst auch Stimmen für einzelne Kontakte hinterlegen)</Bullet>
            </ul>
            <p className="font-medium text-foreground">Ablauf:</p>
            <ul className="space-y-1">
              <Bullet>Du lädst eine Stimmprobe hoch → Diese wird an ElevenLabs übermittelt → Ein Stimmmodell wird erstellt.</Bullet>
              <Bullet>Beim Vorlesen wird der Nachrichtentext an ElevenLabs gesendet → Die generierte Audiodatei wird an dein Gerät zurückgegeben.</Bullet>
            </ul>
            <p className="font-medium text-foreground">Einwilligung & Consent-System:</p>
            <p>
              Die Nutzung der Voice-Funktion erfolgt ausschließlich mit deiner ausdrücklichen Einwilligung. Du wirst vor der Erstellung einer Stimme explizit um Zustimmung gebeten. Andere Nutzer können deine Stimme nur verwenden, wenn du ihnen das über das integrierte Consent-System erlaubst. Du kannst erteilte Freigaben jederzeit widerrufen.
            </p>
            <p className="font-medium text-foreground">Gespeicherte Consent-Daten:</p>
            <ul className="space-y-1">
              <Bullet>Wer die Freigabe angefragt hat (Nutzer-ID)</Bullet>
              <Bullet>Status der Freigabe (ausstehend, erteilt, abgelehnt)</Bullet>
              <Bullet>Zeitstempel der Anfrage und Aktualisierung</Bullet>
            </ul>
            <p className="font-medium text-foreground">Löschung:</p>
            <p>
              Du kannst dein Stimmprofil jederzeit in den App-Einstellungen löschen. Bei der Löschung wird das Stimmmodell sowohl in unserer Datenbank als auch bei ElevenLabs unwiderruflich entfernt.
            </p>
            <p>
              Anbieter: ElevenLabs Inc., New York, USA.<br />
              Datenschutz: <a href="https://elevenlabs.io/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">elevenlabs.io/privacy</a>
            </p>
            <p><strong>Rechtsgrundlage:</strong> Ausdrückliche Einwilligung (Art. 6 Abs. 1 lit. a, Art. 9 Abs. 2 lit. a DSGVO).</p>
          </div>
        </section>

        {/* 12. Stripe */}
        <Section title="12. Zahlungen (Stripe)" delay={500}>
          <p>
            Für Premium-Abonnements nutzt Clemio den Zahlungsdienstleister <strong>Stripe</strong>. Die Zahlungsabwicklung findet direkt bei Stripe statt.
          </p>
          <p className="font-medium text-foreground">Verarbeitete Daten:</p>
          <ul className="space-y-1">
            <Bullet>Zahlungsinformationen (z. B. Kreditkartendaten) – werden ausschließlich bei Stripe verarbeitet, nicht auf unseren Servern</Bullet>
            <Bullet>Abo-Status, Laufzeit und Gründungsmitglied-Status</Bullet>
            <Bullet>Stripe-Kunden-ID (zur Zuordnung deines Kontos)</Bullet>
          </ul>
          <p>
            Anbieter: Stripe Inc., San Francisco, USA.<br />
            Datenschutz: <a href="https://stripe.com/de/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">stripe.com/de/privacy</a>
          </p>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).</p>
        </Section>

        {/* 13. KI-Übersetzung */}
        <Section title="13. KI-Übersetzung (Google Gemini)" delay={540}>
          <p>
            Clemio bietet eine Echtzeit-Übersetzungsfunktion für Nachrichten. Dabei wird der Nachrichtentext an ein KI-Modell von Google gesendet.
          </p>
          <p className="font-medium text-foreground">Verarbeitete Daten:</p>
          <ul className="space-y-1">
            <Bullet>Der zu übersetzende Nachrichtentext</Bullet>
            <Bullet>Die Quell- und Zielsprache</Bullet>
          </ul>
          <p>
            Die Übermittlung erfolgt über einen API-Gateway-Dienst (Lovable AI Gateway, betrieben von GPT Engineer AB, Schweden). Der Gateway leitet die Anfrage an das KI-Modell weiter. Weder der Gateway noch der KI-Anbieter speichern die übermittelten Texte dauerhaft.
          </p>
          <p>
            KI-Modell: Google Gemini (Google LLC, USA).<br />
            Datenschutz: <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">policies.google.com/privacy</a>
          </p>
          <p><strong>Rechtsgrundlage:</strong> Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) bzw. Vertragserfüllung.</p>
        </Section>

        {/* 14. Clemio-KI Assistent */}
        <Section title="14. Clemio-KI Assistent (Antwortvorschläge & Nachrichtenverbesserung)" delay={560}>
          <p>
            Clemio bietet einen KI-gestützten Assistenten („Clemio-KI"), der dir hilft, passende Antworten zu formulieren oder eigene Nachrichten zu verbessern. Die Funktion wird aktiv durch den Nutzer über den ✨-Button im Chat ausgelöst.
          </p>
          <p className="font-medium text-foreground">Verarbeitete Daten:</p>
          <ul className="space-y-1">
            <Bullet>Die empfangene Nachricht, auf die geantwortet werden soll, oder die eigene Nachricht, die verbessert werden soll</Bullet>
            <Bullet>Die letzten 5 Nachrichten des Chatverlaufs (als Kontext)</Bullet>
            <Bullet>Die eingestellte App-Sprache</Bullet>
            <Bullet>Kein Zugriff auf andere Chats, Kontakte oder persönliche Daten</Bullet>
          </ul>
          <p className="font-medium text-foreground">Nutzungsbegrenzung:</p>
          <ul className="space-y-1">
            <Bullet>Kostenlose Nutzer: maximal 3 Anfragen pro Tag</Bullet>
            <Bullet>Premium-Nutzer: unbegrenzte Nutzung</Bullet>
            <Bullet>Zur Durchsetzung der Begrenzung wird jede Nutzung mit Zeitstempel und Nutzer-ID erfasst</Bullet>
          </ul>
          <p>
            Die Übermittlung erfolgt über den Lovable AI Gateway (GPT Engineer AB, Schweden) an das KI-Modell Google Gemini. Es werden keine Chatinhalte dauerhaft beim Gateway oder KI-Anbieter gespeichert. Die Verarbeitung erfolgt ausschließlich zur Generierung der Antwortvorschläge.
          </p>
          <p>
            KI-Modell: Google Gemini (Google LLC, USA).<br />
            Datenschutz: <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">policies.google.com/privacy</a>
          </p>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) – die Funktion ist Bestandteil des Dienstes und wird nur auf aktive Nutzeranfrage ausgeführt.</p>
        </Section>

        {/* 14. Privatsphäre-Einstellungen */}
        <Section title="14. Privatsphäre-Einstellungen" delay={580}>
          <p>
            Du kannst in den App-Einstellungen verschiedene Privatsphäre-Optionen konfigurieren:
          </p>
          <ul className="space-y-1">
            <Bullet><strong>Lesebestätigungen:</strong> Ob andere sehen können, dass du ihre Nachricht gelesen hast (blaue Häkchen).</Bullet>
            <Bullet><strong>Zustellstatus:</strong> Ob der Zustellstatus deiner Nachrichten angezeigt wird.</Bullet>
            <Bullet><strong>Online-Status:</strong> Ob dein Online-Status für Kontakte sichtbar ist.</Bullet>
            <Bullet><strong>Tipp-Anzeige:</strong> Ob „schreibt…" angezeigt wird, während du tippst.</Bullet>
            <Bullet><strong>Push-Vorschau:</strong> Ob Push-Benachrichtigungen den Nachrichteninhalt oder nur einen anonymen Hinweis anzeigen.</Bullet>
          </ul>
          <p>
            Diese Einstellungen werden in deinem Profil gespeichert und serverseitig berücksichtigt.
          </p>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).</p>
        </Section>

        {/* 15. Offline-Funktionalität */}
        <Section title="15. Offline-Funktionalität & Service Worker" delay={620}>
          <p>
            Clemio kann als Progressive Web App (PWA) installiert werden. Dabei wird ein Service Worker eingesetzt, der folgende Funktionen bietet:
          </p>
          <ul className="space-y-1">
            <Bullet>Zwischenspeicherung von App-Ressourcen für Offline-Nutzung</Bullet>
            <Bullet>Lokale Warteschlange für Nachrichten bei fehlender Internetverbindung (werden bei Wiederverbindung automatisch gesendet)</Bullet>
            <Bullet>Hintergrundverarbeitung von Push-Benachrichtigungen</Bullet>
          </ul>
          <p>
            Offline gespeicherte Daten verbleiben lokal auf deinem Gerät und werden nur zur Synchronisation mit dem Server verwendet.
          </p>
          <p><strong>Rechtsgrundlage:</strong> Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).</p>
        </Section>

        {/* 16. Drittstaaten */}
        <Section title="16. Datenübertragung in Drittländer" delay={660}>
          <p>
            Einige der von uns genutzten Dienste verarbeiten Daten außerhalb der EU/des EWR. Es gilt:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-medium text-foreground">Dienst</th>
                  <th className="text-left py-2 pr-3 font-medium text-foreground">Land</th>
                  <th className="text-left py-2 font-medium text-foreground">Grundlage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr><td className="py-2 pr-3">Supabase</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
                <tr><td className="py-2 pr-3">Google (STUN, FCM, Gemini)</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
                <tr><td className="py-2 pr-3">Apple (APNs)</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
                <tr><td className="py-2 pr-3">ElevenLabs</td><td className="py-2 pr-3">USA</td><td className="py-2">Einwilligung + Standardvertragsklauseln</td></tr>
                <tr><td className="py-2 pr-3">Stripe</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
                <tr><td className="py-2 pr-3">Metered.ca</td><td className="py-2 pr-3">Kanada</td><td className="py-2">Angemessenheitsbeschluss</td></tr>
                <tr><td className="py-2 pr-3">Lovable AI Gateway</td><td className="py-2 pr-3">Schweden (EU)</td><td className="py-2">Innerhalb EU/EWR</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Bei Übermittlungen in die USA stützen wir uns auf das EU-US Data Privacy Framework (Angemessenheitsbeschluss der EU-Kommission vom 10.07.2023) sowie auf Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
          </p>
        </Section>

        {/* 17. Rechtsgrundlagen */}
        <Section title="17. Rechtsgrundlagen im Überblick" delay={700}>
          <ul className="space-y-2">
            <Bullet accent><strong>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung):</strong> Voice-Cloning, Push-Benachrichtigungen</Bullet>
            <Bullet accent><strong>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung):</strong> Registrierung, Messaging, Anrufe, Kontaktverwaltung, Zahlungen, Privatsphäre-Einstellungen</Bullet>
            <Bullet accent><strong>Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse):</strong> Hosting, technischer Betrieb, STUN/TURN-Server, KI-Übersetzung</Bullet>
            <Bullet accent><strong>Art. 9 Abs. 2 lit. a DSGVO (Einwilligung bei besonderen Kategorien):</strong> Biometrische Stimmdaten</Bullet>
          </ul>
        </Section>

        {/* 18. Speicherdauer */}
        <Section title="18. Speicherdauer" delay={740}>
          <ul className="space-y-2">
            <Bullet><strong>Kontodaten:</strong> Bis zur Löschung deines Kontos.</Bullet>
            <Bullet><strong>Nachrichten & Medien:</strong> Bis zur Löschung durch den Nutzer oder Kontolöschung.</Bullet>
            <Bullet><strong>Anrufhistorie:</strong> Bis zur Kontolöschung.</Bullet>
            <Bullet><strong>Kontakt-Aliase & Einstellungen:</strong> Bis zur Kontolöschung.</Bullet>
            <Bullet><strong>Stimmprofile & Consent-Daten:</strong> Bis zum Widerruf der Einwilligung oder zur Kontolöschung.</Bullet>
            <Bullet><strong>Online-Status:</strong> Wird bei Abmeldung oder Inaktivität automatisch zurückgesetzt.</Bullet>
            <Bullet><strong>Zahlungsdaten:</strong> Gemäß handels- und steuerrechtlichen Aufbewahrungsfristen (bis zu 10 Jahre).</Bullet>
            <Bullet><strong>Push-Tokens:</strong> Bis zur Deaktivierung oder Kontolöschung. Ungültige Tokens werden automatisch entfernt.</Bullet>
          </ul>
          <p>
            Bei einer Kontolöschung werden alle personenbezogenen Daten vollständig und unwiderruflich entfernt, einschließlich Nachrichten, Medien, Stimmprofile, Consent-Daten, Kontakt-Einstellungen und Authentifizierungsdaten.
          </p>
        </Section>

        {/* 19. Rechte */}
        <Section title="19. Deine Rechte" delay={780}>
          <p>Du hast nach der DSGVO folgende Rechte:</p>
          <ul className="space-y-1">
            <Bullet accent><strong>Auskunft</strong> (Art. 15 DSGVO) – Welche Daten über dich gespeichert sind</Bullet>
            <Bullet accent><strong>Berichtigung</strong> (Art. 16 DSGVO) – Korrektur falscher Daten</Bullet>
            <Bullet accent><strong>Löschung</strong> (Art. 17 DSGVO) – Löschung deiner Daten</Bullet>
            <Bullet accent><strong>Einschränkung</strong> (Art. 18 DSGVO) – Einschränkung der Verarbeitung</Bullet>
            <Bullet accent><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) – Export deiner Daten</Bullet>
            <Bullet accent><strong>Widerspruch</strong> (Art. 21 DSGVO) – Widerspruch gegen die Verarbeitung</Bullet>
            <Bullet accent><strong>Widerruf der Einwilligung</strong> – Jederzeit, ohne Angabe von Gründen</Bullet>
          </ul>
          <p>
            Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist das Bayerische Landesamt für Datenschutzaufsicht (BayLDA).
          </p>
        </Section>

        {/* 20. Sicherheit */}
        <Section title="20. Sicherheitsmaßnahmen" delay={820}>
          <p>Wir setzen folgende Maßnahmen zum Schutz deiner Daten ein:</p>
          <ul className="space-y-1">
            <Bullet>TLS-Verschlüsselung für alle Datenübertragungen</Bullet>
            <Bullet>Row Level Security (RLS) – Jeder Nutzer kann nur auf seine eigenen Daten zugreifen</Bullet>
            <Bullet>Gehashte Passwörter (bcrypt)</Bullet>
            <Bullet>VAPID-Verschlüsselung für Push-Benachrichtigungen (AES-128-GCM)</Bullet>
            <Bullet>Zugriffskontrolle über serverseitige Policies und Security-Definer-Funktionen</Bullet>
            <Bullet>Signierte URLs mit Ablaufzeit für den Zugriff auf private Dateien</Bullet>
            <Bullet>Pfadbasierte Eigentümerprüfung für Datei-Uploads</Bullet>
          </ul>
          <p>
            Trotz aller Schutzmaßnahmen kann keine absolute Sicherheit garantiert werden.
          </p>
        </Section>

        {/* 21. Mindestalter */}
        <Section title="21. Mindestalter" delay={860}>
          <p>
            Die Nutzung von Clemio ist ab 16 Jahren gestattet. Personen unter 16 Jahren dürfen die App nicht nutzen. Bei der Registrierung wird eine entsprechende Bestätigung abgefragt.
          </p>
        </Section>

        {/* Lösch-Hinweis */}
        <section className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 animate-reveal-up" style={{ animationDelay: "900ms" }}>
          <p className="text-sm text-foreground leading-relaxed">
            🗑️ <strong>Kontolöschung:</strong> Du kannst dein Konto jederzeit in den Profileinstellungen vollständig löschen. Dabei werden alle Daten unwiderruflich entfernt – einschließlich Nachrichten, Medien, Stimmprofile, Consent-Daten, Kontakt-Einstellungen, Push-Subscriptions und das Authentifizierungsprofil. Bei ElevenLabs gespeicherte Stimmmodelle werden ebenfalls gelöscht. Eine Wiederherstellung ist nicht möglich.
          </p>
        </section>

        {/* Kontakt */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "940ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">Kontakt für Datenschutzfragen</h3>
          <p className="text-sm text-muted-foreground">
            Bei Fragen zum Datenschutz oder zur Ausübung deiner Rechte erreichst du uns unter:{" "}
            <a href="mailto:privacy@clemio.app" className="text-primary font-medium hover:underline">
              privacy@clemio.app
            </a>
          </p>
        </section>

        {/* Trust */}
        <section className="animate-reveal-up" style={{ animationDelay: "980ms" }}>
          <div className="bg-accent/5 border border-accent/10 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-foreground">🔐 Deine Daten gehören dir. Keine Werbung, kein Tracking, keine Weitergabe an Dritte zu Werbezwecken.</p>
          </div>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
