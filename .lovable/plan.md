

## Plan: Admin-Features erweitern

Fünf neue Admin-Funktionen werden hinzugefügt.

---

### 1. User-Suche & Filter

In `AdminPage.tsx` ein Suchfeld oben einbauen, das nach Name und Telefonnummer filtert (clientseitig, da die Nutzerzahl überschaubar ist).

### 2. Subscription verwalten

**Edge Function** (`admin-manage-user`): Neue Action `set-subscription` — setzt `premium_until` und `plan` für einen User via Service-Role.

**Admin UI**: Pro User ein kleines Badge (Free/Premium/Founding) + Button "Premium gewähren" / "Premium entziehen" mit Datums-Auswahl.

### 3. Admin-Dashboard/Stats

Oben auf der Admin-Seite eine Statistik-Leiste mit:
- Gesamtzahl User
- Aktive User (letzte 7 Tage, basierend auf `user_presence.last_seen`)
- Blockierte User
- Nachrichten gesamt
- Premium-User

Die Daten kommen über eine neue Action `stats` in der Edge Function, die per Service-Role die Counts abfragt.

### 4. Passwort zurücksetzen

**Edge Function**: Neue Action `reset-password` — ruft `admin.auth.admin.updateUserById(targetUserId, { password: newPassword })` auf.

**Admin UI**: Button "Passwort zurücksetzen" → Dialog mit Passwort-Eingabe.

### 5. Nachrichtenanzahl pro User

In der `list`-Action der Edge Function zusätzlich die Anzahl gesendeter Nachrichten pro User mitliefern (ein COUNT-Query auf `messages` gruppiert nach `sender_id`). Wird als kleine Zahl neben dem Usernamen angezeigt.

---

### Dateien

| Datei | Änderung |
|---|---|
| `supabase/functions/admin-manage-user/index.ts` | Actions `stats`, `set-subscription`, `reset-password` + Message-Count bei `list` |
| `src/pages/AdminPage.tsx` | Suchfeld, Stats-Dashboard, Subscription-Badge/Buttons, Passwort-Dialog, Nachrichten-Count |

