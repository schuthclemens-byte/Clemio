

## Suchfeld oben in den Einstellungen

### Was du willst
Ein Suchfeld ganz oben auf der Einstellungen-Seite, mit dem du schnell eine bestimmte Einstellung findest, ohne durch alle Akkordeon-Sektionen zu scrollen.

### So funktioniert's

**Sticky Suchleiste oben**
- Direkt unter dem Seitentitel „Einstellungen" eine Suchzeile mit Lupen-Icon und Platzhalter „Einstellung suchen…".
- Bleibt beim Scrollen oben kleben (`sticky top-0`), damit sie immer erreichbar ist.
- Ein „×"-Knopf rechts im Feld löscht die Eingabe.

**Live-Filter beim Tippen**
- Während du tippst (debounced ~150 ms) werden alle Akkordeon-Sektionen und Einträge nach Treffern in **Titel** und **Beschreibung** durchsucht (Groß/Klein egal, Akzent-tolerant).
- Sektionen ohne Treffer werden ausgeblendet.
- Sektionen mit Treffern öffnen sich automatisch und zeigen nur die passenden Einträge.
- Treffer-Begriff wird im Text **gelb hervorgehoben** (Markierung).

**Leerer Zustand**
- Keine Treffer → freundliche Zeile: „Keine Einstellung gefunden für ‚xyz'."

**Suchbar sind:**
Alle bestehenden Einträge in Profil, Privatsphäre, Anzeige, Barrierefreiheit (inkl. Schrift, Bedienung links/rechts), Benachrichtigungen, Töne, Sprache, Abo, Konto, etc. — basierend auf den i18n-Texten, die schon vorhanden sind.

### Code-Änderungen

- **`src/pages/SettingsPage.tsx`**:
  - Neuer State `searchQuery` (string).
  - Sticky-Container oben mit `<Input>` + Lupen- und Lösch-Icon.
  - Eine `matches(text)`-Hilfsfunktion (lowercase + `normalize("NFD")` für Akzente).
  - Jede Sektion erhält ein `searchableTexts: string[]`-Array (Titel + Beschreibungen der Items). Sektion wird nur gerendert, wenn mindestens ein Item matcht.
  - Akkordeon-`defaultValue` / `value` wird bei aktiver Suche auf alle matchenden Sektionen gesetzt (automatisch geöffnet).
  - Kleine `<Highlight text query />`-Helper-Komponente, die den Treffer mit `<mark>` umschließt.

- **`src/i18n/{de,en,es,fr,tr,ar}.ts`**: 2 neue Keys
  - `settings.searchPlaceholder` — DE: **„Einstellung suchen…"**
  - `settings.searchEmpty` — DE: **„Keine Einstellung gefunden für ‚{query}'."**

### Was nicht angefasst wird
- Inhalte und Logik der Einstellungen selbst.
- Andere Seiten, Auth, DB, Realtime.
- Die zuletzt umgesetzten Schrift- und Hand-Einstellungen.

### Tests
1. `/settings` öffnen → Suchfeld klebt oben.
2. „dunkel" tippen → nur Theme-Eintrag sichtbar, Wort gelb markiert.
3. „links" tippen → „Bedienung / Linke Hand" sichtbar, Sektion automatisch offen.
4. „xyz" tippen → Leer-Hinweis erscheint.
5. „×" drücken → alle Sektionen wieder im Normalzustand.
6. Sprache umstellen (EN/ES/FR/TR/AR) → Platzhalter und Leer-Text übersetzt, i18n-Sync-Test grün.

### STATUS
- Umfang: 1 Page + 6 i18n-Dateien.
- Risiko: niedrig (rein UI, keine Logik-/Datenänderung).
- Fertig nach Approval: ja.

