

## Schrift-Einstellungen erweitern: Geltungsbereich + Schriftart-Auswahl

### Was du willst
1. **Lesbare Schrift** soll wählbar sein: nur im Chat oder in der ganzen App
2. **Neue Option: Schriftart auswählen** — aus mehreren Schriften wählen können

### Wie das umgesetzt wird

**1. Neuer Eintrag „Schriftart" in der Untergruppe Barrierefreiheit**

Innerhalb der ausklappbaren „Barrierefreiheit"-Sektion kommt unter „Lesbare Schrift" ein neuer Eintrag:

```
Barrierefreiheit ▼
  ├─ Lesbare Schrift              [○] „Leichter zu lesen …"
  │    └─ Wo anwenden?      [Ganze App ▼]   ← NEU (nur sichtbar wenn an)
  │         Optionen: „Ganze App" / „Nur Chats"
  ├─ Schriftart                   [System ▼]   ← NEU
  │    Optionen:
  │      • System (Standard)
  │      • Inter (klar & modern)
  │      • Atkinson Hyperlegible (sehr lesbar)
  │      • OpenDyslexic (für Legasthenie)
  │      • Serif (klassisch)
  │      • Mono (gleiche Buchstabenbreite)
  ├─ Größerer Text
  ├─ Hoher Kontrast
  ├─ Autokorrektur und Vorschläge
  └─ Weniger Text
```

**2. Wirkung im Code**

- **Ganze App**: `<html>` bekommt die gewählte Schriftart-Klasse → wirkt überall
- **Nur Chats**: nur ChatBubble + ChatInput bekommen die Klasse → Rest bleibt System-Schrift
- **Schriftart-Auswahl**: setzt CSS-Variable `--font-family-app`, die in `index.css` die `body`-Schrift steuert

**3. Schriften einbinden**
- **System / Inter / Serif / Mono**: bereits per CSS verfügbar, keine Downloads nötig
- **Atkinson Hyperlegible** + **OpenDyslexic**: kostenlos via Google Fonts / lokale Einbindung in `index.html` (lazy: nur laden wenn ausgewählt)

**4. Speicherung**
- Beide Werte landen in `AccessibilityContext` → localStorage:
  - `fontScope`: `"app"` | `"chat"`
  - `fontFamily`: `"system"` | `"inter"` | `"atkinson"` | `"opendyslexic"` | `"serif"` | `"mono"`

### Texte (menschlich, ruhig, ohne Fachjargon)

**Lesbare Schrift** (bestehend):
- „Leichter zu lesen – ruhiger für deine Augen"

**Wo anwenden?** (neu):
- Label: „Wo anwenden?"
- Optionen: „Ganze App" / „Nur in Chats"

**Schriftart** (neu):
- Label: „Schriftart"
- Beschreibung: „Wähle eine Schrift, die sich für dich gut liest"
- Option-Beschreibungen kurz unter dem Namen:
  - System: „Wie auf deinem Gerät"
  - Inter: „Klar und modern"
  - Atkinson Hyperlegible: „Sehr gut lesbar"
  - OpenDyslexic: „Für leichteres Lesen"
  - Serif: „Klassisch mit Serifen"
  - Mono: „Gleiche Buchstabenbreite"

### Dateien, die angefasst werden
- `src/contexts/AccessibilityContext.tsx` — `fontScope` + `fontFamily` als State, Setter, localStorage
- `src/pages/SettingsPage.tsx` — 2 neue Zeilen in der Barrierefreiheit-Untergruppe (Select für Scope, Select für Font)
- `src/index.css` — neue Klassen `.font-inter`, `.font-atkinson`, `.font-opendyslexic`, `.font-serif`, `.font-mono`; Klasse `.dyslexia-font` reagiert auf Scope (`html.dyslexia-font` vs. `.dyslexia-chat-only`)
- `src/components/chat/ChatBubble.tsx` + `src/components/chat/ChatInput.tsx` — bekommen Klasse `chat-text` für Scope-Targeting
- `index.html` — `<link>` zu Google Fonts (Atkinson + OpenDyslexic, mit `display=swap`)
- `src/i18n/{de,en,es,fr,tr,ar}.ts` — neue Keys:
  - `settings.fontScope`, `settings.fontScopeApp`, `settings.fontScopeChat`
  - `settings.fontFamily`, `settings.fontFamilyDesc`
  - `settings.font.system`, `.inter`, `.atkinson`, `.opendyslexic`, `.serif`, `.mono`

### Was nicht angefasst wird
- Bestehende Toggles (Größerer Text, Hoher Kontrast, Autokorrektur, Weniger Text)
- Struktur der Settings-Seite (Akkordeon bleibt)
- Design-Settings-Seite (Farben, Magie-Modus)
- Chat-Logik, Auth, Backend

### Test nach Umsetzung
1. `/settings` → Anzeige → Barrierefreiheit aufklappen
2. „Lesbare Schrift" einschalten → neue Zeile „Wo anwenden?" erscheint, Standard „Ganze App"
3. Auf „Nur in Chats" stellen → Settings-Seite wird wieder Standard-Schrift, ChatBubbles behalten Lesbare Schrift
4. „Schriftart" → „OpenDyslexic" wählen → Schrift in der ganzen App ändert sich
5. Auf „System" zurück → wieder Standard
6. Sprache umstellen → alle neuen Labels übersetzt, i18n-Sync-Test grün

### STATUS
- Umfang: 1 Context + 1 Page + 1 CSS + 2 Chat-Komponenten + 6 i18n-Dateien + 1 index.html
- Risiko: niedrig (additiv, beeinflusst keine Auth/DB/Realtime-Logik)
- Performance: Atkinson + OpenDyslexic werden nur geladen wenn aktiv ausgewählt
- Fertig nach Approval: ja

