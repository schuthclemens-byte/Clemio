

## Browser-Spracheinstellung respektieren — kein Hardcoded-Deutsch

### Verstanden
Dein Browser ist ein englischer Build (Chrome EN), aber du hast die **Spracheinstellung** im Browser auf **Deutsch** umgestellt. Das ist genau das, was die App auslesen soll → die Seite muss Deutsch zeigen.

### Aktuelle Situation
`navigator.language` und `navigator.languages` geben in deinem Fall vermutlich **trotzdem `en` zurück**, weil:
- `navigator.language` liest die UI-Sprache des Browsers (= englisch installiert)
- die von dir gesetzten Sprach-Präferenzen landen zwar in `navigator.languages`, aber oft **hinter** der UI-Sprache
- ältere Chrome-Versionen ignorieren die Reihenfolge teilweise ganz

Die App nutzt aktuell in `src/lib/locale.ts` nur `navigator.languages` ohne Sonderfall-Behandlung → liefert `en` → falsche Anzeige.

### Lösung
`detectBrowserLocale()` so umbauen, dass es **die komplette Liste `navigator.languages` durchgeht** und die **erste unterstützte Sprache** zurückgibt — nicht nur den ersten Eintrag. Wenn Deutsch irgendwo in der Präferenzliste steht, gewinnt es vor unsupported Codes.

Konkret:
1. `navigator.languages` (Array) auslesen — Fallback auf `[navigator.language]`
2. Über alle Einträge iterieren, jeweils die ersten 2 Zeichen nehmen (`de-DE` → `de`)
3. Den **ersten Eintrag zurückgeben, der in den supported locales (`de`, `en`, `es`, `fr`, `tr`, `ar`) vorkommt**
4. Wenn keiner matched → Fallback `de` (statt `en`)

Damit:
- englischer Browser + DE in den Spracheinstellungen → **DE** ✅
- englischer Browser ohne DE-Präferenz → EN
- deutscher Browser → DE
- französischer Browser mit EN-Fallback → FR

### Geänderte Datei
- `src/lib/locale.ts` — Funktion `detectBrowserLocale()` erweitern (ca. 8 Zeilen)

### Nicht geändert
- Switcher, manuelle Auswahl in `localStorage`, alle i18n-Strings, alle anderen Routen.

### Risiko
Null. Wer aktuell EN sieht und EN als Top-Präferenz hat, sieht weiter EN. Wer DE in den Browser-Einstellungen hat (auch hinter EN), sieht ab sofort DE.

### Debug-Hilfe vorab
Ich kann zusätzlich ein einmaliges `console.log(navigator.languages)` einbauen, damit wir sehen was dein Browser **wirklich** meldet — falls Deutsch dort gar nicht auftaucht, müsste die Browser-Einstellung selbst nachjustiert werden.

