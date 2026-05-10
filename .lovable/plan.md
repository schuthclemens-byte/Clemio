## Ziel

Das Drei-Punkte-Menü (⋮) in der Haupt-Chat-Liste soll nur noch zwei Einträge haben:
- 🗂️ Archivierte Chats
- 🗑️ Papierkorb

Der Eintrag **„Auswählen"** wird entfernt. Mehrfachauswahl gibt es ausschließlich **innerhalb** der Seiten *Archivierte Chats* und *Papierkorb* — dort ist sie bereits vorhanden (Tap auf einen Chat = auswählen, Aktionsleiste unten zum Wiederherstellen / Verschieben / endgültig Löschen).

## Änderungen

### `src/pages/ChatListPage.tsx`
- Im Dropdown-Menü den Eintrag **„Auswählen"** entfernen.
- Den dazugehörigen Mehrfachauswahl-Modus inkl. State, Header-Umschaltung, Checkbox-Overlay und Bottom-Action-Bar aus der Haupt-Chat-Liste entfernen (wird hier nicht mehr gebraucht).
- Tap auf Chat = wieder direkt öffnen, Swipe-Aktionen (Archivieren / In Papierkorb mit Undo-Toast) bleiben unverändert.

### Unverändert
- `ManageChatsPage.tsx` (Archiv & Papierkorb) — Mehrfachauswahl bleibt dort wie sie ist.
- `ArchivedChatsPage.tsx`, `TrashPage.tsx`, `chatManagement.ts`, Migration, Auto-Purge nach 30 Tagen.

## Ergebnis

```text
Chat-Liste Header:
┌──────────────────────────────┐
│ Chats              [+] [⋮]   │
└──────────────────────────────┘
                         │
                         ├─ Archivierte Chats
                         └─ Papierkorb

Innerhalb von Archiv / Papierkorb:
- Tap auf Chat = auswählen (Checkbox)
- "Alle / Keine" Button im Header
- Aktionsleiste unten: Wiederherstellen, Verschieben, Endgültig löschen
```
