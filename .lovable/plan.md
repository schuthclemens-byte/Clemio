

## Plan: Blockierte Nutzer verwalten in Einstellungen

### Übersicht
Im Konto-Bereich der Einstellungen einen neuen Link "Blockierte Nutzer" hinzufügen, der eine eigene Seite öffnet. Dort werden alle blockierten Nutzer mit Name/Avatar aufgelistet, und man kann sie per Button entblocken.

### Änderungen

**1. Neue Seite `src/pages/BlockedUsersPage.tsx`**
- Lädt alle Einträge aus `blocked_users` wo `blocked_by = auth.uid()`
- Für jeden blockierten User: Profil-Daten (Name, Avatar) über `profiles` laden (braucht RPC oder separate Query, da Profiles nur eigenes Profil lesen können)
- Liste mit Avatar, Name und "Entblocken"-Button
- Entblocken: DELETE aus `blocked_users`, Toast-Bestätigung
- Leerer Zustand: "Keine blockierten Nutzer"

**2. Neue RPC-Funktion (Migration)**
- `get_blocked_profiles`: SECURITY DEFINER Funktion die für den aktuellen User die blockierten User-IDs holt und deren `display_name`, `first_name`, `avatar_url` aus `profiles` zurückgibt — damit umgehen wir die RLS-Einschränkung auf Profiles

**3. `src/pages/SettingsPage.tsx`**
- Im Konto-Accordion nach "Angemeldet bleiben" einen neuen `LinkRow` einfügen: Icon `Ban`, Label "Blockierte Nutzer" → navigiert zu `/blocked-users`

**4. `src/App.tsx`**
- Neue Route `/blocked-users` → `BlockedUsersPage` (geschützt)

**5. i18n-Dateien** (`de.ts`, `en.ts` etc.)
- Keys: `settings.blockedUsers`, `blocked.empty`, `blocked.unblock`, `blocked.unblocked`

### Dateien
| Datei | Änderung |
|---|---|
| Migration (SQL) | RPC `get_blocked_profiles` |
| `src/pages/BlockedUsersPage.tsx` | Neue Seite |
| `src/pages/SettingsPage.tsx` | LinkRow hinzufügen |
| `src/App.tsx` | Route hinzufügen |
| `src/i18n/de.ts`, `en.ts` | Neue Übersetzungs-Keys |

