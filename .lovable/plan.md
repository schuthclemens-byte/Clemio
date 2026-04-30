## Sicherheits-Paket (Schritte 1+2+3)

Ziel: Backend-Härtung in drei Bereichen — **Funktionsrechte**, **Admin-Nachvollziehbarkeit**, **Datenschutz im Error-Logging**. Keine bestehenden Features werden entfernt; nur Schutz wird verstärkt.

### Aktueller Stand (geprüft)

- `admin_audit_log` Tabelle existiert bereits mit RLS (Admins lesen, service_role schreibt).
- `admin-manage-user` Edge Function hat bereits Action-Allowlist, UUID-Validierung, Self-Action-Schutz und schreibt Audit-Einträge für die meisten Aktionen.
- DB-Funktionen sind bereits gegen `anon` und `PUBLIC` geschützt — nur `authenticated` und `service_role` haben EXECUTE. Allerdings existieren **3 veraltete Overloads** von `log_app_error_report` und `list_app_error_reports`, die aufgeräumt werden müssen.
- Error-Logging hat bereits Redaction und Allowlist für `details`, aber **kein Rate-Limit pro Nutzer** — ein Fehler-Loop kann die DB fluten.

---

### 1. Funktionsrechte aufräumen & härten

**Migration:**

- Alte Overloads von `log_app_error_report` und `list_app_error_reports` löschen (nur die aktuelle Signatur mit allen Filtern behalten).
- `REVOKE EXECUTE ... FROM PUBLIC, anon` für **alle** SECURITY DEFINER Funktionen explizit setzen (defensive Härtung, falls je versehentlich neu vergeben).
- Trigger-Funktionen (`notify_new_message`, `notify_admin_on_report`, `notify_chat_invitation`, `handle_new_user`, `handle_new_subscription`, `enforce_*`, `sync_profile_phone_normalized`, `update_*_timestamp`) explizit auf nur `service_role` beschränken — die werden nur von Triggern aufgerufen.
- Queue-Funktionen (`enqueue_email`, `read_email_batch`, `delete_email`) auf `service_role` only beschränken.

**Ergebnis:** Linter-Warnungen reduziert, klar dokumentiert wer was darf.

---

### 2. Admin-Audit-Log erweitern

**Edge Function `admin-manage-user`:**

- Audit-Eintrag **immer** schreiben — auch bei `stats`, `list`, `list-reports`, `list-errors`, `send-test-push` (aktuell nur bei mutierenden Aktionen). So entsteht ein vollständiges Aktivitätsprotokoll.
- Im Fehlerfall (try/catch um jede Aktion) `audit(false, {...}, error)` schreiben statt einfach 500 zurückzugeben.
- Sensible Felder (`newPassword`) **niemals** in Metadaten schreiben — nur ein Marker `{ password_set: true }`.
- Neutralere externe Fehlermeldungen: statt `error.message` durchreichen → generisch `"Aktion fehlgeschlagen"`, Detail nur in Audit-Log.

**Admin-UI (`AdminPage.tsx` oder neuer Tab):**

- Neuer Read-Only Tab „Audit-Log": zeigt letzte 200 Admin-Aktionen mit Filter nach Aktion und Admin.
- Nutzt bestehende RLS-Policy (Admins lesen).

**Ergebnis:** Jede Admin-Aktion ist nachvollziehbar, Passwörter erscheinen nie in Logs, Admins sehen ihre eigene Historie.

---

### 3. Error-Logging Datenschutz & Rate-Limit

**Migration:**

- Neue Tabelle `error_log_rate_limit` (oder Spalte in vorhandener) zur Zählung pro User/Stunde — alternativ: Logik direkt in `log_app_error_report` RPC mit Window-Query gegen `app_error_reports.created_at`.
- RPC `log_app_error_report` erweitern: vor Insert prüfen, wieviele **neue Fingerprints** (nicht Updates) der User in der letzten Stunde erzeugt hat. Limit: **50/Stunde**. Bei Überschreitung: stilles `RETURN NULL` ohne Fehler (Client soll nicht crashen).
- Stack-Truncation in RPC von 8000 → **4000 Zeichen** reduzieren (Stacktraces enthalten häufig URLs/Parameter).

**Client (`src/lib/appErrorLogging.ts`):**

- Allowlist für `details` weiter verschärfen: `componentStack` auf 1000 Zeichen kürzen.
- Zusätzliche Redaction-Patterns: lange Base64-Strings (>200 Zeichen → `[base64]`), URL-Query-Parameter mit `token=`/`key=` → `[redacted]`.
- Bei `console.error`-Hook: wenn Argument-Sum >5000 Zeichen, nur ersten 2000 + Hinweis loggen.

**Ergebnis:** Keine sensiblen Daten in Logs, Fehler-Loops können DB nicht mehr fluten, Tabelle bleibt schlank.

---

### Technische Details

```text
Migration 1: function_permissions_hardening.sql
  - DROP veraltete Overloads (log_app_error_report ohne _category, etc.)
  - REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon (explizit für alle SD)
  - REVOKE auch von authenticated für trigger-only und queue-only
  - GRANT EXECUTE TO service_role wo nötig

Migration 2: error_log_rate_limit.sql
  - log_app_error_report RPC erweitert um Rate-Limit-Check
  - Stack-Limit auf 4000

Edge Function Update: admin-manage-user/index.ts
  - audit() für alle Aktionen, auch reads
  - Generic external error messages
  - Password redaction in metadata

Frontend Update: src/lib/appErrorLogging.ts
  - Erweiterte Redaction-Patterns
  - Client-side max-length Guard

Frontend Add: src/components/admin/AdminAuditLog.tsx (neue Komponente)
  - Read-only Tabelle, Filter nach Action/Admin
  - Eingebunden in AdminPage.tsx als neuer Tab
```

### Tests

- Vorhandene `appErrorLogging.test.ts` erweitern: Rate-Limit-Verhalten, neue Redaction-Patterns.
- Manueller Test: Admin-Aktion durchführen → im neuen Audit-Log Tab sichtbar.

### Was **nicht** Teil des Pakets ist (für später)

- Storage-Cleanup, Daten-Export DSGVO, neue Nutzerfeatures, CI-Erweiterung — kommt in einem separaten Paket.
