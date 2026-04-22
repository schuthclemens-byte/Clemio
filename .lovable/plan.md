

## Links- / Rechtshänder-Modus

### Was du willst
Eine neue Einstellung, die festlegt, ob die App für Rechts- oder Linkshänder optimiert ist. Bedien-Elemente (vor allem im Chat) wandern dann auf die für die Hand bequeme Seite.

### Was sich konkret ändert

**Im Chat-Eingabefeld (`ChatInput.tsx`)**
- **Rechtshänder (Standard, heute):** Mikrofon/Senden-Button rechts, Anhang-Button links.
- **Linkshänder:** Mikrofon/Senden-Button **links**, Anhang-Button **rechts** → Daumen erreicht den Senden-Button bequem mit der linken Hand.

**In den Chat-Bubbles (`ChatBubble.tsx`)**
- Das Kontext-Menü (Drei-Punkte-Button bei eigenen Nachrichten) und Reaktions-Picker öffnen sich zur jeweils bequemen Seite.

**In der Bottom-Tab-Leiste (`BottomTabBar.tsx`)**
- Optional: häufig genutzte Tabs (Chats) wandern auf die Daumenseite.
  → **Entscheidung:** Wir lassen die Tab-Leiste **unverändert**, weil sie symmetrisch ist und ein Umordnen verwirren würde. Nur Chat-Bedienelemente werden gespiegelt.

**Floating Action Button (Neuer Chat in `ChatListPage.tsx`)**
- Wandert von rechts unten nach links unten bei Linkshänder-Modus.

### Neue Einstellung in Barrierefreiheit

```
Barrierefreiheit ▼
  ┌─ Schrift ──────────────────────────────┐
  │  … (bestehend)                          │
  └─────────────────────────────────────────┘
  
  ┌─ Bedienung ────────────────────────────┐ ← NEU
  │  Welche Hand benutzt du?  [Rechts ▼]    │
  │     → „Rechte Hand"                      │
  │     → „Linke Hand"                       │
  │  Wirkt: Senden-Knopf, Anhang-Knopf,     │
  │         Schnell-Aktionen                 │
  └─────────────────────────────────────────┘
  
  Größerer Text
  Hoher Kontrast
  …
```

### Texte (alle 6 Sprachen)

Neue i18n-Keys:
- `settings.handedness` — DE: **„Welche Hand benutzt du?"**
- `settings.handednessRight` — DE: **„Rechte Hand"**
- `settings.handednessLeft` — DE: **„Linke Hand"**
- `settings.handednessDesc` — DE: **„Wir legen den Senden-Knopf und Schnell-Aktionen auf deine bequeme Seite."**

### Code-Änderungen

- **`src/contexts/AccessibilityContext.tsx`**:
  - Neuer State `handedness: "right" | "left"`, Default `"right"`.
  - Speicherung in localStorage (gleiches Schema wie `fontFamily`).
  - Setter `setHandedness(side)`.
  - Setzt CSS-Klasse `left-handed` auf `<html>`, wenn aktiv.

- **`src/components/chat/ChatInput.tsx`**:
  - Reihenfolge der Buttons abhängig von `handedness` (Anhang ↔ Senden tauschen).
  - Optional: `flex-row-reverse` auf den Button-Container, wenn `left-handed`.

- **`src/components/chat/ChatBubble.tsx`**:
  - Position des Kontext-Menü-Buttons spiegeln (links bei Linkshändern bei eigenen Nachrichten).

- **`src/pages/ChatListPage.tsx`**:
  - FAB-Position (`bottom-right` ↔ `bottom-left`) abhängig von `handedness`.

- **`src/pages/SettingsPage.tsx`**:
  - Neue „Bedienung"-Karte in der Barrierefreiheit-Sektion mit Dropdown (Rechts/Links).

- **`src/i18n/{de,en,es,fr,tr,ar}.ts`**: 4 neue Keys.

### Was nicht angefasst wird
- Tab-Leiste unten (bleibt symmetrisch).
- Auth, DB, Realtime, Voice, Push.
- Andere Seiten (Profil, Einstellungen-Layout an sich).
- Die Schrift-Einstellungen (bleiben wie zuletzt umgesetzt).

### Tests nach Umsetzung
1. `/settings` → Anzeige → Barrierefreiheit aufklappen → neue Karte „Bedienung" sichtbar, Standard „Rechte Hand".
2. Auf „Linke Hand" stellen → Chat öffnen → Senden-Knopf liegt **links**, Anhang-Knopf rechts.
3. Eigene Nachricht antippen → Kontext-Menü öffnet auf der bequemen Seite.
4. Chat-Liste → FAB „Neuer Chat" liegt links unten.
5. Auf „Rechte Hand" zurück → alles wieder im Standard-Layout.
6. Sprache umstellen (EN/ES/FR/TR/AR) → alle neuen Texte übersetzt, i18n-Sync-Test grün.

### STATUS
- Umfang: 1 Context + 4 Komponenten/Seiten + 6 i18n-Dateien.
- Risiko: niedrig (rein UI-Spiegelung, keine Logikänderung).
- Fertig nach Approval: ja.

