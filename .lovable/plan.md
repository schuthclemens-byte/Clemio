

## Plan: Admin-System für Account-Verwaltung

Dein Account (Clemens, `49a49e20-...`) bekommt Admin-Rechte, mit denen du andere Accounts löschen und blockieren kannst.

---

### 1. Datenbank: Admin-Rolle & Blocked-Tabelle

**user_roles** Tabelle (Best Practice für Rollen):
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Dich als Admin eintragen
INSERT INTO public.user_roles (user_id, role)
VALUES ('49a49e20-3c9f-4728-8672-46a3b7a6465a', 'admin');
```

**Security-Definer Funktion** `has_role()` für sichere Prüfung ohne RLS-Rekursion.

**blocked_users** Tabelle:
```sql
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
```

### 2. Edge Function: `admin-manage-user`

- **DELETE**: Ruft dieselbe Logik wie `delete-account` auf, aber für beliebige User (nur wenn Anfragender Admin ist)
- **BLOCK**: Setzt Eintrag in `blocked_users`, deaktiviert den Auth-User via `admin.updateUserById(userId, { banned_until: 'forever' })`
- **UNBLOCK**: Entfernt Block und hebt Ban auf

### 3. Admin-Seite: `/admin`

- Nur sichtbar/erreichbar für Admins
- Liste aller registrierten Nutzer (Name, Nummer, Registrierungsdatum)
- Buttons: **Blockieren** / **Entblockieren** / **Account löschen**
- Bestätigungs-Dialog vor destruktiven Aktionen

### 4. Login-Schutz für blockierte User

In `AuthContext.tsx` nach erfolgreichem Login prüfen, ob der User in `blocked_users` steht → Fehlermeldung anzeigen und Session beenden.

---

### Dateien

| Datei | Änderung |
|---|---|
| Migration | `user_roles`, `blocked_users` Tabellen + `has_role()` Funktion + RLS |
| `supabase/functions/admin-manage-user/index.ts` | Neue Edge Function für Delete/Block/Unblock |
| `src/pages/AdminPage.tsx` | Neue Admin-Übersichtsseite |
| `src/hooks/useAdminRole.ts` | Hook zur Admin-Prüfung |
| `src/App.tsx` | Route `/admin` hinzufügen (geschützt) |
| `src/contexts/AuthContext.tsx` | Block-Check nach Login |
| `src/components/BottomTabBar.tsx` | Admin-Link für Admins |

