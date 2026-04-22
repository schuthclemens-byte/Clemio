
## Design ist nicht wirklich gelöscht, sondern weiter versteckt

### Ursache
Der Eintrag ist inzwischen wieder im Code vorhanden:

- `src/pages/SettingsPage.tsx`, Zeilen 409–411: `LinkRow` für `t("design.title")` mit Navigation zu `/design-settings`
- Aber: `src/pages/SettingsPage.tsx`, Zeile 156 setzt `openSection` standardmäßig auf `null`

Dadurch sind **alle Akkordeon-Sektionen beim Öffnen von `/settings` eingeklappt**. Der Design-Eintrag liegt in der Sektion **„Anzeige"** und ist deshalb im ersten Blick **unsichtbar**, obwohl er technisch da ist. Das erklärt, warum er für dich „immer noch weg" wirkt.

### Fix
Den Design-Eintrag so sichtbar machen, dass er nicht mehr wie „verschwunden" wirkt.

**Empfohlene Umsetzung:**
1. `SettingsPage.tsx` anpassen, damit die Sektion **„Anzeige" standardmäßig geöffnet** ist
   - `useState<SectionKey | null>("display")` statt `null`
2. Den Design-Eintrag **innerhalb der Anzeige-Sektion an erster Position** belassen
3. Optional zusätzlich:
   - Design als **eigenen direkten Link oberhalb der Akkordeons** anzeigen, wenn maximale Sichtbarkeit gewünscht ist

### Warum das die richtige Korrektur ist
- Der vorherige Fix hat den Eintrag technisch zurückgebracht
- Das eigentliche UX-Problem bleibt aber bestehen: **versteckt in geschlossener Sektion**
- Mit offenem „Anzeige"-Bereich ist der Eintrag sofort sichtbar, ohne dass du erst raten oder suchen musst

### Was nicht geändert werden muss
- Route `/design-settings` in `App.tsx` (existiert)
- `DesignSettingsPage.tsx` (existiert)
- i18n-Keys `design.title` / `design.settingsDesc` (werden bereits verwendet)
- Profil-Seite separat (nur falls du Design zusätzlich auch dort haben willst)

### Umsetzungsschritte
1. `src/pages/SettingsPage.tsx`
   - Initialzustand von `openSection` von `null` auf `"display"` ändern
2. Sichtprüfung:
   - `/settings` öffnen
   - „Anzeige" ist direkt aufgeklappt
   - „Design" mit Palette-Icon ist ohne weiteren Klick sichtbar
3. Navigationsprüfung:
   - Klick auf „Design"
   - Route wechselt zu `/design-settings`
   - Zurück führt wieder zu `/settings`

### Beweis nach Umsetzung
- Ursache: Eintrag vorhanden, aber durch `openSection = null` verborgen
- Fix: Anzeige-Sektion standardmäßig offen
- Test:
  1. `/settings` laden
  2. „Design" sofort sichtbar
  3. Klick öffnet `/design-settings`
  4. Rücknavigation funktioniert
- Erwarteter Nachweis im Code:
  - `const [openSection, setOpenSection] = useState<SectionKey | null>("display");`

### STATUS
- Ursache identifiziert: ja
- Technischer Fix definiert: ja
- Umsetzung erfolgt: nein (Read-only-Modus)
- Fertig: nein
