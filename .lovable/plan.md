

## Design-Eintrag in den Einstellungen wiederherstellen

### Ursache
Die Seite `/design-settings` (Farben, Magie-Modus, Effekte, Hintergrund) existiert vollständig — Route, Komponente und i18n-Keys sind alle da. Beim letzten Umbau der Settings-Seite auf Akkordeon-Sektionen wurde aber **der Link-Eintrag in `SettingsPage.tsx` versehentlich nicht mit übernommen**. Deshalb taucht „Design" nirgendwo mehr auf, obwohl die Seite intern noch funktioniert (direkt aufrufbar über `/design-settings`).

### Fix
Einen `LinkRow`-Eintrag „Design" in der Akkordeon-Sektion **„Anzeige"** in `src/pages/SettingsPage.tsx` ergänzen:

- Icon: `Palette` (lucide-react)
- Label: `t("design.title")` → „Design"
- Description: `t("design.settingsDesc")` → „Farben, Effekte & Magie-Modus"
- onClick: `navigate("/design-settings")`
- Position: als erster Eintrag in der „Anzeige"-Sektion (oberhalb von Sprache/Theme), weil es der prominenteste visuelle Einstieg ist

### Was NICHT angefasst wird
- `DesignSettingsPage.tsx` selbst (funktioniert)
- Route in `App.tsx` (existiert)
- i18n-Keys (existieren in allen 6 Sprachen)
- Profile-Seite (Design gehört in Settings, nicht ins Profil)

### Test nach Fix
1. `/settings` öffnen → Sektion „Anzeige" aufklappen → Eintrag „Design" mit Palette-Icon sichtbar
2. Klick darauf → leitet zu `/design-settings` weiter
3. Zurück-Button bringt zurück zu `/settings`
4. In allen 6 Sprachen prüfen, dass Label korrekt erscheint (Keys existieren bereits → keine i18n-Test-Fehler)

**STATUS**: Ursache identifiziert (fehlender LinkRow), Fix ist 1 Datei, ~8 Zeilen. Fertig nach Approval.

