

## Klarere Schrift-Einstellungen — eine gemeinsame „Wo soll das gelten?"-Frage

### Das Problem heute
- Die Auswahl **„Schriftart"** sagt nirgends, **wo** sie wirkt (überall? nur Chat?).
- Die Frage **„Wo anwenden?"** erscheint nur bei „Schrift bei Lese-Schwäche" — wirkt aber im Code auch auf die Schriftart-Auswahl.
- Beide Optionen liegen optisch getrennt → Nutzer denkt, sie sind unabhängig.

### Was geändert wird

**1. „Wo soll das gelten?" wird zur gemeinsamen, immer sichtbaren Frage**

Statt versteckt unter dem Lese-Schwäche-Toggle wird das eine **eigene, immer sichtbare Zeile** ganz oben in der Schrift-Untergruppe. Sie steuert sowohl die Lese-Schwäche-Schrift als auch die ausgewählte Schriftart.

**2. Visuelle Gruppierung in einer Karte „Schrift"**

Innerhalb der „Barrierefreiheit"-Untergruppe entsteht ein zusammenhängender Block:

```
Barrierefreiheit ▼
  ┌─ Schrift ───────────────────────────────────┐
  │  Wo soll das gelten?      [Überall ▼]       │
  │      → „Überall in der App"                  │
  │      → „Nur in deinen Chats"                 │
  │                                              │
  │  Schriftart auswählen     [System ▼]        │
  │  Wirkt: Überall in der App ←  Live-Hinweis   │
  │                                              │
  │  [○] Schrift bei Lese-Schwäche              │
  │      Eine spezielle Schrift, die Lesen…     │
  │      Wirkt: Überall in der App ← Live-Hinweis│
  └──────────────────────────────────────────────┘
  
  Größerer Text
  Hoher Kontrast
  Autokorrektur und Vorschläge
  Weniger Text
```

**3. Live-Hinweis direkt unter Schriftart und Lese-Schwäche**

Unter beiden Optionen steht in kleiner Schrift, **was gerade gilt**:
- Wenn „Überall": *„Wirkt: in der ganzen App"*
- Wenn „Nur Chats": *„Wirkt: nur in deinen Chats"*

Sobald der Nutzer die obere Auswahl ändert, ändert sich der Hinweis live unter beiden Zeilen.

**4. Die Schriftart-Vorschau nutzt die ausgewählte Schrift**

Die Optionen im Dropdown selbst bekommen `style={{ fontFamily: ... }}`, sodass der Nutzer im Dropdown direkt sieht, **wie** jede Schrift aussieht.

### Texte (alle 6 Sprachen)

**Neue / geänderte Keys:**
- `settings.fontSection` — DE: „Schrift" / EN: „Font"
- `settings.fontScope` — DE: **„Wo soll das gelten?"** (statt vorher unklar)
- `settings.fontScopeApp` — DE: **„Überall in der App"**
- `settings.fontScopeChat` — DE: **„Nur in deinen Chats"**
- `settings.fontAppliesTo` — neu, DE: **„Wirkt:"**
- `settings.fontAppliesApp` — neu, DE: **„in der ganzen App"**
- `settings.fontAppliesChat` — neu, DE: **„nur in deinen Chats"**

Beispiel-Resultat unter „Schriftart": *„Wirkt: in der ganzen App"*

### Code-Änderung (was wo)

- **`src/pages/SettingsPage.tsx`**:
  - „Wo soll das gelten?"-Zeile aus dem `dyslexiaFont`-`if`-Block herausziehen und nach oben als eigenständige Zeile setzen (immer sichtbar).
  - Unter der Schriftart-Auswahl + unter der Lese-Schwäche-Beschreibung jeweils eine kleine Zeile mit dem Live-Hinweis einfügen.
  - Optional: leichte Karten-Optik (z. B. `bg-secondary/20`) um die drei Schrift-Zeilen, damit klar ist, dass sie zusammengehören.
  - Dropdown-Optionen `<option>` bekommen `style={{ fontFamily: <jeweilige Schrift> }}` für Vorschau.

- **`src/i18n/{de,en,es,fr,tr,ar}.ts`**: 3 neue Keys (`fontSection`, `fontAppliesTo`, `fontAppliesApp`, `fontAppliesChat`) und Feinschliff der vorhandenen Scope-Keys.

- **`src/contexts/AccessibilityContext.tsx`**: keine Änderung — `fontScope` gilt im Code bereits sowohl für Lese-Schwäche als auch für die Schriftart-Auswahl, das wird jetzt nur **sichtbar** gemacht.

### Was nicht angefasst wird
- Logik in `index.css` und Chat-Komponenten (Scope-Klassen funktionieren schon richtig).
- Andere Toggles (Größerer Text, Hoher Kontrast, Autokorrektur, Weniger Text).
- Auth, DB, Realtime.

### Tests nach Umsetzung
1. `/settings` → Anzeige → Barrierefreiheit aufklappen.
2. „Wo soll das gelten?" steht ganz oben, immer sichtbar, Standard „Überall in der App".
3. Schriftart auf „OpenDyslexic" → unter dem Dropdown steht „Wirkt: in der ganzen App" → Settings-Schrift ändert sich.
4. „Wo soll das gelten?" auf „Nur in deinen Chats" → Hinweis wechselt zu „Wirkt: nur in deinen Chats" → Settings-Schrift wird wieder System, im Chat bleibt OpenDyslexic.
5. „Schrift bei Lese-Schwäche" einschalten → Hinweis darunter folgt derselben Scope-Auswahl.
6. Sprache umstellen (EN/ES/FR/TR/AR) → alle neuen Texte übersetzt, i18n-Sync-Test grün.

### STATUS
- Ursache klar: Scope-Auswahl war versteckt + Schriftart hatte keinen sichtbaren Geltungsbereich.
- Umfang: 1 Page + 6 i18n-Dateien.
- Risiko: niedrig (rein UI/Text, keine Logikänderung).
- Fertig nach Approval: ja.

