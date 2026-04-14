

## Plan: Gruppenchat verbessern

### Übersicht
Gruppenname und Gruppen-Avatar direkt im Mitglieder-Sheet bearbeiten. Admin-Rechte (Ersteller) werden visuell gekennzeichnet. Mitglieder entfernen funktioniert bereits – wird beibehalten.

### Änderungen

**1. Migration: `avatar_url` Spalte zur `conversations`-Tabelle**
```sql
ALTER TABLE public.conversations ADD COLUMN avatar_url text;
```
Keine neuen RLS-Policies nötig – die bestehende UPDATE-Policy für Members erlaubt bereits Änderungen.

**2. `src/components/chat/GroupMembersSheet.tsx` – Erweitern**
- Oben im Sheet: Gruppenavatar (klickbar zum Hochladen) + Gruppenname (editierbar, nur für Creator)
- Avatar-Upload in den bestehenden `avatars`-Storage-Bucket
- Gruppenname inline editierbar mit Stift-Icon
- `onNameChanged` Callback hinzufügen, damit ChatPage den Namen aktualisiert

**3. `src/pages/ChatPage.tsx` – Anpassungen**
- `GroupMembersSheet` bekommt neue Props: `groupName`, `groupAvatarUrl`, `onNameChanged`, `onAvatarChanged`
- Chat-Header zeigt Gruppen-Avatar neben dem Namen an
- Nach Änderung wird `chatName` / Avatar-State aktualisiert

**4. `src/pages/ChatListPage.tsx` – Gruppen-Avatar in Liste**
- Wenn `conversation.avatar_url` vorhanden, in der Chat-Liste anzeigen statt Fallback-Initiale

### Dateien
| Datei | Änderung |
|---|---|
| Migration (SQL) | `avatar_url` zu `conversations` |
| `GroupMembersSheet.tsx` | Avatar-Upload, Name-Edit UI, neue Props |
| `ChatPage.tsx` | Props weiterreichen, Header-Avatar, State-Updates |
| `ChatListPage.tsx` | Gruppen-Avatar in Liste anzeigen |

