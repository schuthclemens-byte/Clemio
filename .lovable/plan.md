

## „Lesbare Schrift" verständlicher + Autokorrektur stärker + Barrierefreiheit-Untergruppe einklappbar

### Was geändert wird

**1. „Lesbare Schrift" (Dyslexia-Font) bekommt eine klare Beschreibung**
Heute steht da nur „Lesbare Schrift" — niemand versteht, was das tut. Neu:
- Label: **„Lesbare Schrift"**
- Beschreibung: **„Spezielle Schriftart für Legasthenie / leichteres Lesen"**

Gleiches Beschreibungsprinzip auch für die anderen Toggles, die bisher nackt dastanden:
- **Größerer Text** → „Vergrößert alle Texte in der App"
- **Hoher Kontrast** → „Stärkere Farben für bessere Sichtbarkeit"
- **Autokorrektur und Vorschläge** → „Korrigiert Tippfehler und schlägt Wörter vor"

i18n-Keys ergänzt in allen 6 Sprachen (DE/EN/ES/FR/TR/AR), damit der Sync-Test grün bleibt:
- `settings.dyslexiaFontDesc`
- `settings.largeTextDesc`
- `settings.highContrastDesc`
- `settings.autoCorrectDesc`

**2. Autokorrektur deutlich stärker machen**
`src/hooks/useAutoCorrect.ts` wird ausgebaut:

- **Mehr Korrektur-Einträge** (DE: ~60 → ~250+, EN: ~25 → ~150+). Tippfehler wie „nciht", „weiß nciht", „kanst", „mochte" usw. werden jetzt zuverlässig erkannt.
- **Auto-Kapitalisierung**: Erstes Wort eines Satzes (Anfang oder nach `.`/`!`/`?`+Space) automatisch groß.
- **Doppel-Leerzeichen → Punkt+Space** (iOS-Style: "hallo  " → "hallo. ").
- **Mehr Wortvorschläge**: Wortliste auf ~500 Einträge erweitert (Top-Frequenz-Wörter aus Chat-Kontext).
- **Bessere Reihenfolge**: Erst Präfix-Treffer, dann Levenshtein ≤2 — wie bisher, aber mit größerem Pool deutlich treffsicherer.
- **Nach Korrektur Toast/Hinweis**: Optional kleiner inline-Hinweis „nciht → nicht" für 1.5 s über dem Eingabefeld (subtil, nicht störend).

Default-Sprache: bei `locale="de"` werden DE-Wörter+Korrekturen genutzt — Logik bleibt, wird aber massiv besser bestückt.

**3. Barrierefreiheit-Untergruppe als ausklappbares Raster**
Aktuell stehen in der „Anzeige"-Sektion direkt untereinander:
- Lesbare Schrift, Größerer Text, Hoher Kontrast, Autokorrektur, Weniger Text

→ Diese 5 Toggles werden in eine **eigene ausklappbare Untergruppe „Barrierefreiheit"** verpackt — mit Pfeil-Icon zum Auf-/Zuklappen, optisch genau wie die Hauptsektionen, nur eine Stufe verschachtelt (kleinere Schrift, dezenterer Header).

Struktur unter „Anzeige":
```
ANZEIGE ▼
  ├─ Design                    →
  ├─ Sprache              [DE ▼]
  └─ Barrierefreiheit ▼        ← NEU: ausklappbar
       ├─ Lesbare Schrift          [○] „Spezielle Schriftart …"
       ├─ Größerer Text             [○] „Vergrößert alle Texte"
       ├─ Hoher Kontrast            [○] „Stärkere Farben …"
       ├─ Autokorrektur+Vorschläge  [●] „Korrigiert Tippfehler …"
       └─ Weniger Text              [○] „Lange Nachrichten kürzen"
```

Standardmäßig **eingeklappt** — die Liste ist dann viel kürzer und übersichtlicher. Wer's braucht, klickt auf den Pfeil und sieht die fünf Schalter mit klaren Beschreibungen.

### Dateien, die angefasst werden
- `src/pages/SettingsPage.tsx` — neue Untergruppen-Komponente `SubAccordion` (oder lokale `useState` für „a11y-expanded"); 5 ToggleRows mit Description; Anzeige standardmäßig zu.
- `src/hooks/useAutoCorrect.ts` — erweiterte Wortliste, erweiterte Korrekturen, Auto-Kapitalisierung, Doppel-Space-zu-Punkt.
- `src/i18n/de.ts`, `en.ts`, `es.ts`, `fr.ts`, `tr.ts`, `ar.ts` — 4 neue Beschreibungs-Keys + Label „Barrierefreiheit" für Sub-Header (`settings.a11yGroup`).

### Was nicht angefasst wird
- Routing, Auth, Backend, Design-Settings-Seite
- Logik der Autokorrektur (nur Daten + 2 kleine Regeln dazu, kein Umbau)
- Andere Settings-Sektionen (Kommunikation, Wiedergabe, Konto, Rechtliches)

### Test-Plan nach Umsetzung
1. `/settings` öffnen → „Anzeige" ist offen → Untergruppe „Barrierefreiheit" ist **zu**, Liste wirkt kurz.
2. Klick auf „Barrierefreiheit ▼" → klappt auf, alle 5 Toggles mit **Beschreibungstext** sichtbar.
3. „Lesbare Schrift" einschalten → Beschreibung „Spezielle Schriftart …" sichtbar, Schrift ändert sich.
4. In Chat tippen: „nciht", „kanst", „weiss" + Space → werden zu „nicht", „kannst", „weiß" korrigiert.
5. Satzanfang klein tippen („hallo wie geht's") → erstes Wort wird groß.
6. Sprache umstellen (EN/ES/FR/TR/AR) → alle Beschreibungen + „Barrierefreiheit"-Header übersetzt; i18n-Sync-Test bleibt grün.
7. Untergruppe zuklappen → Pfeil dreht zurück, Toggles wieder versteckt.

### STATUS
- Ursache klar: 3 Probleme (unklarer Label, schwache Korrektur, zu lange Liste)
- Fix-Umfang: 1 Hook + 1 Page + 6 i18n-Dateien
- Risiko: niedrig (additiv, keine Logikänderung an Auth/DB)
- Fertig nach Approval: ja

