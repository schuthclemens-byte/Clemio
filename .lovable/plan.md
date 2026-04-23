

## „Hoher Kontrast" wirkt jetzt wirklich

### Das Problem
Du schaltest „Hoher Kontrast" ein → **nichts ändert sich sichtbar**.

**Ursache (in `src/index.css`):**
Die Klasse `.high-contrast` überschreibt heute nur 6 CSS-Variablen:
```
--foreground, --background, --chat-mine, --chat-theirs, --muted-foreground, --border
```
Wichtige Tokens wie `--card`, `--secondary`, `--primary`, `--input`, `--ring`, `--accent`, `--destructive` bleiben unverändert. **Außerdem gibt es keinen Dark-Mode-Override** — im dunklen Theme würden weißer Hintergrund + schwarzer Text das Layout zerschießen statt verstärken. Ergebnis: Buttons, Karten, Eingabefelder und Akzente sehen identisch zum Normalmodus aus.

### Was geändert wird

**Nur eine Datei: `src/index.css`** (Block ab Zeile 373).

**1. Light-Mode High-Contrast — alle Token härter**
- Reines Schwarz auf reinem Weiß für Text/Hintergrund.
- `--primary` dunkler/satter (Orange 38% statt 55%) → bessere Lesbarkeit auf Weiß.
- `--accent`, `--destructive` ebenfalls voll gesättigt und dunkler.
- `--border` und `--input` auf reines Schwarz → jede Karte, jeder Knopf, jedes Eingabefeld bekommt sichtbare Umrandung.
- `--muted-foreground` von 25% auf 18% Helligkeit → graue Beschreibungstexte werden lesbar.

**2. Dark-Mode High-Contrast (NEU, gab es vorher nicht)**
Eigener Block `.dark.high-contrast`:
- Reines Schwarz Hintergrund, reines Weiß Text.
- `--primary` heller/wärmer (Orange 60%) für Kontrast auf Schwarz.
- `--accent` Gelb 60% (sticht stark heraus).
- `--border` weiß → alle Karten/Buttons bekommen weiße Umrandung.

**3. Zusätzliche visuelle Verstärkung**
- Eingabefelder und Textareas: **`border-width: 2px`** (statt 1px) → klar sichtbar.
- Fokus-Ring: **`outline: 3px solid` + 2px Offset** auf alle Elemente mit `focus-visible` → Tab-Navigation jederzeit sichtbar.
- Links: **immer unterstrichen** mit 3px Offset.
- Alle Borders nutzen `!important`, um Tailwind-Defaults zu überschreiben.

### Was du sofort siehst (Vorher → Nachher)

| Element | Vorher | Nachher (Light HC) | Nachher (Dark HC) |
|---|---|---|---|
| Karten/Akkordeon | hauchdünner grauer Rand | **dicker schwarzer Rand** | **dicker weißer Rand** |
| Senden-Button | Orange #F97316 | **dunkleres, satteres Orange** | **leuchtendes Orange** |
| Eingabefelder | grauer 1px Rand | **schwarzer 2px Rand** | **weißer 2px Rand** |
| Beschreibungstexte | mittelgrau | **fast schwarz** | **fast weiß** |
| Toggle-Switches | grau/orange | **schwarz/dunkelorange mit Rand** | **weiß/leuchtorange mit Rand** |
| Fokus (Tab) | dezent | **dicker oranger Ring** | **dicker oranger Ring** |
| Eigene Chat-Bubbles | Standard-Orange | **dunkles Orange (besser auf Weiß)** | **leuchtendes Orange** |

### Was nicht angefasst wird
- Keine TypeScript- oder Komponenten-Änderungen.
- Keine i18n-Änderungen (Texte bleiben gleich).
- Keine DB- oder Auth-Änderungen.
- Normaler Modus (ohne High-Contrast) bleibt 1:1 wie heute.

### Tests
1. `/settings` → „Hoher Kontrast" einschalten im **Light-Mode** → alle Karten bekommen schwarze Ränder, Texte werden tiefschwarz, Buttons satter.
2. Auf Dark-Mode wechseln → bleibt im High-Contrast → Hintergrund tiefschwarz, alle Ränder weiß, Akzente leuchten.
3. Tab-Taste drücken → dicker oranger Fokus-Ring um den fokussierten Knopf.
4. „Hoher Kontrast" wieder aus → alles zurück im Standard-Look.
5. Chat öffnen → eigene Nachrichten haben kräftigeres Orange, fremde Nachrichten klare schwarze Umrandung.

### STATUS
- Ursache klar: zu wenige Tokens überschrieben + kein Dark-Mode-Override.
- Umfang: 1 CSS-Block (~110 Zeilen, ersetzt 9 Zeilen).
- Risiko: niedrig (nur Klasse `.high-contrast` betroffen, normaler Modus unverändert).
- Fertig nach Approval: ja.

