Ich passe den Fehlerbereich im Admin so an, dass du Einträge gezielt löschen und sinnvoll filtern kannst.

## Ziel
Die Fehlerliste im Admin soll nicht nur nach Bearbeitungsstatus, sondern auch nach Relevanz filterbar sein – z. B. offen, erledigt, geprüft und problematisch. Außerdem bekommt die Löschfunktion eine klarere und verlässlichere Bedienung.

## Umsetzung

1. **Filter im Fehlerbereich erweitern**
   - Die bestehende Status-Filterung bleibt erhalten, wird aber verständlicher beschriftet.
   - Zusätzlich kommt ein zweiter Filter für die Problemstufe:
     - alle
     - problematisch
     - Fehler
     - Warnung
     - kritisch/fatal
   - „Problematisch“ wird aus der vorhandenen Severity abgeleitet, damit besonders wichtige Einträge schnell sichtbar sind.

2. **Kombinierte Filterlogik einbauen**
   - Fehler werden gleichzeitig nach:
     - Status (`open`, `reviewed`, `resolved`)
     - Schweregrad (`warning`, `error`, `fatal`)
     gefiltert.
   - So kannst du z. B. direkt nur offene problematische Fehler sehen.

3. **Löschfunktion im Admin verbessern**
   - Die bereits vorhandene Delete-Action wird im UI klarer herausgestellt.
   - Optional mit Bestätigungsdialog, damit nichts versehentlich gelöscht wird.
   - Nach dem Löschen wird die Liste sofort aktualisiert, damit der Eintrag direkt verschwindet.

4. **Darstellung der Fehler klarer machen**
   - Severity-Badges farblich differenzieren:
     - warning
     - error
     - fatal
   - Problematische Einträge visuell stärker hervorheben.
   - Statuslabels in verständliches Deutsch/Englisch übersetzen.

5. **Open-Count / Badge konsistent halten**
   - Prüfen, dass die Badge-Zählung im Admin-Tab weiter korrekt funktioniert, auch wenn Einträge gelöscht oder auf erledigt/geprüft gesetzt werden.

6. **Feinschliff für Admin-UX**
   - Filter-Chips mobil gut bedienbar halten.
   - Falls sinnvoll: „Filter zurücksetzen“-Option ergänzen.
   - Notiz, Status-Update und Delete sollen sich nicht gegenseitig blockieren.

## Betroffene Bereiche
- `src/components/admin/AdminErrorReports.tsx`
- ggf. kleiner Abgleich in `src/pages/AdminPage.tsx`
- kein zusätzlicher Backend-Umbau nötig, da `delete-error` bereits vorhanden ist

## Technische Details
- Die Datenstruktur für Fehler ist schon vorhanden (`status`, `severity`, `admin_note`, `occurrences`).
- Der Backend-Endpunkt `admin-manage-user` unterstützt das Löschen bereits mit `delete-error`.
- Deshalb ist das hier primär ein UI-/UX-Upgrade mit robusterer Filterlogik.
- Falls ich beim Prüfen sehe, dass „problematisch“ besser als eigener definierter Sammelfilter umgesetzt werden sollte, mappe ich ihn sauber auf bestehende Severity-Werte statt ein neues DB-Feld einzuführen.

Nach Freigabe setze ich das direkt im Admin-Fehlerbereich um.