Ich sehe auf deinem Screenshot: Die GitHub Actions CI schlägt im Job „Build, TypeScript, tests and security“ fehl. In der aktuellen Codeprüfung fallen besonders zwei Stellen auf, die sehr wahrscheinlich den CI-Lauf abbrechen können:

1. `src/hooks/useLiveCaptions.ts`
   - Im nativen SpeechRecognition-Neustart ist die Formatierung/Einrückung im `try/catch`-Block auffällig und fehleranfällig.
   - Außerdem enthält die Datei leere `catch {}`-Blöcke. Eure CI führt `eslint . --quiet` aus; Warnungen brechen dabei zwar normalerweise nicht ab, aber ich würde die Stelle trotzdem sauber und robuster machen, damit daraus kein Folgeproblem wird.

2. `supabase/functions/admin-manage-user/index.ts`
   - Die Backend-Funktion enthält mehrere `catch (e)` / `catch {}`-Stellen, die bei TypeScript/ESLint je nach Regelstand problematisch sein können.
   - Zusätzlich greifen manche `catch (e)`-Blöcke direkt auf `e.message` zu. In TypeScript ist ein gefangener Fehler nicht garantiert ein `Error`.

Plan zur Behebung:

1. Live-Captions-Code stabilisieren
   - Den nativen `listeningState`-Neustart in `useLiveCaptions.ts` sauber strukturieren.
   - Fehlerbehandlung vereinheitlichen, ohne die bestehende Funktionalität zu verändern.
   - Leere `catch`-Blöcke durch sichere No-op-Fehlerbehandlung ersetzen.

2. Admin-Backend-Funktion CI-sicher machen
   - In `admin-manage-user/index.ts` gefangene Fehler sicher in Text umwandeln, z. B. über eine kleine Helper-Funktion.
   - Direkte `e.message`-Zugriffe ersetzen.
   - Leere `catch`-Blöcke vermeiden oder mit einer bewusst benannten No-op-Hilfsfunktion absichern.

3. Admin-Fehlerübersicht unverändert lassen, außer nötig
   - Die zuletzt gewünschten Features sind im UI bereits vorhanden: Statusfilter, Schwerefilter, Suche und Löschen.
   - Ich ändere dort nur etwas, falls sich ein konkreter CI-Fehler aus dieser Datei ergibt.

4. Validierung nach der Umsetzung
   - Keine manuellen Builds ausführen, weil die Umgebung den Build/Typecheck automatisch prüft.
   - Falls erlaubt, gezielt betroffene Tests prüfen oder die bestehende Testabdeckung unangetastet lassen.
   - Danach bekommst du eine kurze Zusammenfassung der behobenen Ursache und der geänderten Dateien.