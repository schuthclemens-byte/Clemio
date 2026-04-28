Ich baue ein internes Fehler-Monitoring ein, damit App-Probleme automatisch im Adminbereich sichtbar werden und du sie bearbeiten kannst.

## Ziel
Wenn bei einem Nutzer ein relevanter Fehler passiert, wird daraus automatisch ein Admin-Eintrag mit Kontext. Im Adminbereich bekommst du einen eigenen Bereich für diese Fehler, inkl. Status und Notizen.

## Umsetzung

1. **Neue Fehler-Tabelle im Backend**
   - Neue Tabelle z. B. `app_error_reports` mit:
     - Nutzer-ID, falls eingeloggt
     - Fehlertitel / Message
     - Stacktrace / technische Details
     - Route, Browser/User-Agent, Plattform
     - Severity: `error`, `warning`, `fatal`
     - Status: `open`, `reviewed`, `resolved`
     - Admin-Notiz
     - Zeitstempel und Zähler für ähnliche Fehler
   - RLS:
     - Nutzer dürfen eigene Fehler einreichen.
     - Admins dürfen alle Fehler lesen, bearbeiten und löschen.
     - Keine öffentliche Lesbarkeit.

2. **Sichere Fehler-Erfassung im Client**
   - Neue kleine Fehler-Logging-Utility, die Fehler an die Datenbank sendet.
   - Erfasst automatisch:
     - `window.error`
     - `unhandledrejection`
     - React-Renderfehler über eine `ErrorBoundary`
     - wichtige manuell abgefangene Fehler, z. B. Captions-/SpeechRecognition-Fehler.
   - Mit Schutz gegen Spam/Race-Conditions:
     - Deduplizierung ähnlicher Fehler im Browser für kurze Zeit.
     - Kein Endlos-Logging, falls das Logging selbst fehlschlägt.
     - Sensible Daten werden nicht absichtlich mitgeloggt; Stack/Message werden gekürzt.

3. **Backend-Funktion für Admin-Aktionen erweitern**
   - `admin-manage-user` bekommt neue Actions:
     - `list-errors`
     - `update-error`
     - optional `delete-error`
   - Die Funktion reichert Fehler mit Nutzername/Telefon an, damit du im Adminbereich direkt siehst, wen es betrifft.

4. **Adminbereich erweitern**
   - Neuer Tab neben `Nutzer`, `Reports`, `Analytics`: **Fehler**.
   - Badge mit Anzahl offener Fehler.
   - Liste mit:
     - Fehlerstatus
     - Severity
     - Nutzer
     - Route/Plattform
     - Zeitpunkt
     - Fehlermeldung
     - aufklappbaren Details/Stacktrace
     - Admin-Notiz
   - Aktionen:
     - „Als geprüft“
     - „Erledigt“
     - „Löschen“
     - Notiz speichern

5. **Realtime-Update**
   - Der Adminbereich aktualisiert den Fehler-Badge automatisch, wenn neue Fehler eintreffen.

6. **Captions-Fehler gezielt erfassen**
   - Bei Untertitel-/SpeechRecognition-Problemen wird zusätzlich der bestehende Debug-Status mitgeloggt:
     - Session-ID
     - native/browser-Modus
     - letzter Captions-Status
   - Wichtig: Das Logging bleibt entkoppelt vom Call-Stream und beeinflusst Telefonate nicht.

7. **Tests**
   - Tests für das Logging-Utility:
     - dedupliziert ähnliche Fehler
     - logged `window.error`
     - logged `unhandledrejection`
     - logged keine Endlosschleife bei Logging-Fehlern
   - Falls sinnvoll: kleiner Test für ErrorBoundary-Verhalten.

## Technische Details

- Keine Rollen auf Profilen: Adminrechte bleiben über die bestehende `user_roles`-Struktur geschützt.
- Keine Änderung an automatisch generierten Dateien wie `src/integrations/supabase/client.ts` oder `types.ts`.
- Migration erstellt die Tabelle, RLS-Policies und optional Realtime für Fehler-Einträge.
- Die Fehler-Erfassung läuft global in `App`/`main` und zusätzlich gezielt in kritischen Hooks wie `useLiveCaptions`.

Nach Freigabe implementiere ich zuerst die Backend-Migration, dann Logging + ErrorBoundary, danach den neuen Admin-Tab und die Tests.