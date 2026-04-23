

## Linkshänder-Modus: sichtbar machen, dass es wirkt

### Das Problem
Du wechselst auf „Linke Hand" → Toast „Gespeichert ✓" erscheint, aber auf der Einstellungen-Seite **siehst du keine Veränderung**. Der Effekt greift technisch (CSS-Klasse `.left-handed` wird gesetzt, im Chat dreht sich die Button-Reihe), aber:

1. Du bist auf **/settings**, nicht im Chat → also keine sichtbare Wirkung dort.
2. Es gibt **keine Live-Vorschau**, die dir zeigt: „so sieht's später aus".
3. Nur **ein** Element (die Chat-Eingabezeile) wird gespiegelt — andere Stellen, an denen man's erwarten würde (FAB „Neuer Chat", Bottom-Tab-Bar-Schwerpunkt), bleiben gleich.

### Was geändert wird

**1. Live-Vorschau direkt unter dem Dropdown (`SettingsPage.tsx`)**
Eine kleine Mock-Chat-Eingabezeile als Vorschau-Karte:
- Zeigt zwei Buttons („+" links/rechts und „Senden" rechts/links) mit Pfeil dazwischen.
- Wechselt sofort beim Umschalten auf „Linke Hand" — du siehst den Effekt direkt.
- Beschriftung: „So sieht deine Chat-Leiste aus" / „This is how your chat bar will look".

**2. Klarere Beschreibung**
Aktuell: „Optimiert die Bedienelemente für die gewählte Hand."
Neu: **„Im Chat wandern Senden- und Plus-Knopf auf die für dich bequemere Seite. Wirkt sofort beim Öffnen eines Chats."**

**3. Wirkungsbereich erweitern (mehr „Aha"-Momente)**
- **`ChatListPage.tsx`**: FAB „Neuer Chat" (`fixed bottom-…`) wandert von `right-…` nach `left-…`, wenn `handedness === "left"`.
- **`ChatBubble.tsx` / `MessageContextMenu.tsx`**: Long-Press-Kontextmenü öffnet sich auf der jeweils bequemen Seite (Anker-Position spiegeln).
- **`AppSidebar.tsx`** (Desktop, falls relevant): bleibt unverändert — Sidebar-Position ist Layout, nicht Bedienkomfort.

**4. Toast-Text präzisieren**
Statt nur „Gespeichert ✓":
- DE: „Linke Hand aktiv — wirkt im Chat."
- DE: „Rechte Hand aktiv (Standard)."
(Plus EN/ES/FR/TR/AR.)

### Code-Änderungen

- **`src/pages/SettingsPage.tsx`**: Mock-Vorschau-Komponente unter dem Hand-Dropdown, neuer Beschreibungstext, neuer Toast-Text.
- **`src/pages/ChatListPage.tsx`**: FAB-Position anhand `handedness` umschalten.
- **`src/components/chat/ChatBubble.tsx`** + **`MessageContextMenu.tsx`**: Menü-Anker spiegeln.
- **`src/i18n/{de,en,es,fr,tr,ar}.ts`**: 4 neue/aktualisierte Keys
  - `settings.handednessDesc` (überschreiben)
  - `settings.handednessPreview` („So sieht deine Chat-Leiste aus")
  - `settings.handednessSavedRight` / `settings.handednessSavedLeft`

### Was nicht angefasst wird
- Logik der Settings (Speichern, Persistenz, `localStorage`).
- Andere Sektionen, Auth, DB.
- Sidebar-/Header-Layout.

### Tests
1. `/settings` → „Linke Hand" wählen → Vorschau-Karte spiegelt sofort, Toast: „Linke Hand aktiv — wirkt im Chat."
2. Chat öffnen → Senden-/Plus-Knopf gespiegelt (wie bisher).
3. `/chats` öffnen → FAB unten **links**.
4. Eigene Nachricht lange drücken → Kontextmenü an bequemer Seite.
5. Zurück auf „Rechte Hand" → alles wieder im Standard-Layout, Toast: „Rechte Hand aktiv (Standard)."
6. i18n-Sync-Test grün (10/10).

### STATUS
- Ursache: Effekt greift, ist aber auf der Settings-Seite unsichtbar → wirkt wie „nichts passiert".
- Umfang: 1 Page (Vorschau) + 3 Komponenten + 6 i18n-Dateien.
- Risiko: niedrig (UI-Spiegelung, kein Logikwechsel).
- Fertig nach Approval: ja.

