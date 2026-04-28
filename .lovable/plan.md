Kurz erklärt: Das Fallback-Verhalten bedeutet, dass Untertitel/Live-Übersetzung nicht die ganze Anrufseite kaputt machen dürfen, wenn iOS/Android SpeechRecognition auf einem Gerät nicht verfügbar ist, die Berechtigung fehlt, das Plugin nicht geladen werden kann oder die Erkennung während des Calls stoppt. Der Call soll normal weiterlaufen; nur der Untertitel-Button und die Sprach-Auswahl werden sauber deaktiviert oder ausgeblendet.

Plan zur Umsetzung:

1. `useLiveCaptions` robuster machen
   - Einen klaren Status ergänzen, z. B. `checking`, `ready`, `unsupported`, `permission-denied`, `error`.
   - Native SpeechRecognition wird sicher geprüft: Plugin-Import, `available()`, Berechtigung, Start/Stop.
   - Wenn etwas davon fehlschlägt, wird nicht geworfen und kein Crash ausgelöst.
   - Captions werden automatisch gestoppt und der Hook meldet `isSupported: false` bzw. einen verständlichen Fehlerstatus.

2. Native-Fallback-Logik verbessern
   - Falls native SpeechRecognition in der App nicht verfügbar ist, bleibt der Call aktiv.
   - In nativer App wird nicht blind auf Browser-Web-Speech zurückgegriffen, weil das in WebViews oft unzuverlässig oder nicht vorhanden ist.
   - Im Browser bleibt der bestehende Web-Speech-Fallback nur dann aktiv, wenn der Admin `native_only` nicht erzwingt.

3. Call-UI korrekt deaktivieren
   - Der Untertitel-Button wird nur aktiv angezeigt, wenn Admin-Freigabe + Plattform-Regel + SpeechRecognition-Unterstützung erfüllt sind.
   - Wenn die Funktion adminseitig aktiv ist, aber das Gerät SpeechRecognition nicht unterstützt, erscheint optional ein kleiner Hinweis wie: `Untertitel auf diesem Gerät nicht verfügbar`.
   - Die Sprach-Auswahl für Übersetzung wird nur angezeigt, wenn Untertitel wirklich laufen können.
   - Wenn SpeechRecognition während eines Calls ausfällt, werden Untertitel beendet, remote captions nicht weitergesendet und die UI zurückgesetzt.

4. Schutz gegen Race Conditions und Cleanup
   - Listener werden immer entfernt, auch wenn Start/Stop fehlschlägt.
   - `SpeechRecognition.stop()` und dynamische Imports werden überall mit sicheren `catch`-Pfaden behandelt.
   - `setIsEnabled(true)` passiert erst, wenn SpeechRecognition wirklich gestartet wurde.

5. Prüfung nach der Umsetzung
   - Typecheck/Test laufen lassen.
   - Manuell logisch prüfen:
     - Admin aus: kein Untertitel-UI.
     - Admin an + Gerät unterstützt es: Button funktioniert.
     - Admin an + Gerät unterstützt es nicht: Call läuft weiter, Untertitel deaktiviert.
     - Berechtigung abgelehnt: Call läuft weiter, UI deaktiviert/zeigt Hinweis.
     - Native Plugin fehlt/Import schlägt fehl: kein Crash.

Technische Details:
- Betroffene Dateien: `src/hooks/useLiveCaptions.ts`, `src/pages/CallPage.tsx`.
- Keine Datenbankänderung nötig.
- Keine Änderung an der bestehenden Admin-Freigabe nötig.
- Nach nativen Änderungen muss lokal nach dem Pull `npx cap sync` ausgeführt werden, damit iOS/Android die aktualisierte Web-App und Plugin-Konfiguration übernehmen.