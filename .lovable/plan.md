## Ziel

Im Admin-Bereich klar trennen:

1. **Fehler & Probleme** (bestehender Tab) — bleibt für App-Fehler, wird aber überarbeitet, sodass jeder Eintrag aufklappbar ist und in Klartext erklärt, was passiert ist.
2. **Aktivitäten** (neuer Tab) — zeigt menschliche Ereignisse: „Sabine hat sich angemeldet", „Tom hat Premium aktiviert", „Anna hat ihre Stimme geklont" usw. Auch hier alles aufklappbar mit Klartext.

---

## Was wird gebaut

### 1. Neue Tabelle `user_activity_log`

Speichert alle nicht-fehler Ereignisse strukturiert.

```text
user_activity_log
├── id, created_at
├── user_id (wer)
├── event_type (signup | premium_activated | premium_cancelled |
│              voice_cloned | voice_deleted | account_deleted |
│              profile_completed | first_chat_created)
├── description (Klartext, z. B. „Sabine hat Premium aktiviert (Plan: Stripe Monatlich)")
└── metadata (jsonb — Plan, Voice-Name, Quelle etc.)
```

RLS: Nur Admins lesen (`has_role admin`). Inserts nur via `service_role` oder SECURITY-DEFINER-Funktionen.

### 2. Automatische Erfassung

Trigger und Edge-Function-Erweiterungen:

- **Anmeldung** → Trigger auf `auth.users` insert (nutzt vorhandenen `handle_new_user`-Pfad) → `signup`-Event.
- **Premium aktiviert/gekündigt** → `subscriptions` AFTER UPDATE Trigger → `premium_activated` / `premium_cancelled`.
- **Stimme geklont/gelöscht** → Trigger auf `voice_profiles` insert/delete.
- **Account gelöscht** → in der bestehenden `delete-account` Edge Function ergänzen.

### 3. RPC `list_user_activity`

Analog zu `list_app_error_reports`: Filter nach Zeitbereich, Event-Typ, Nutzer-Suche, Pagination, Total-Count. Liefert Klartext-Beschreibung + Nutzername.

### 4. UI: Neuer Admin-Tab „Aktivitäten"

- Sidebar-Eintrag in `AdminPage.tsx` (Icon `Activity`, neben Audit-Log).
- Neue Komponente `AdminActivityLog.tsx`. Layout angelehnt an `AdminAuditLog` und `AdminErrorReports`:
  - Filter: Zeitbereich-Presets (1h, 24h, 7T, 30T, eigen), Event-Typ-Dropdown, Nutzer-Suche.
  - Liste mit Karten — pro Eintrag in zugeklappter Form:
    - Icon je Event-Typ
    - **Wer** (Avatar + Name)
    - **Klartext-Beschreibung** („Sabine hat Premium aktiviert")
    - Relative Zeit
    - Chevron zum Aufklappen
  - Aufklappen zeigt: vollständiger Zeitstempel, Plan/Detail aus Metadata, Telefonnummer, Quelle (Trigger/Function), JSON-Rohdaten als Unter-Akkordeon.

### 5. UI: Bestehende Fehler-Liste aufklappbar machen

`AdminErrorReports.tsx` umbauen:

- Eintrag standardmäßig **kompakt**: Icon, Titel in Klartext, Nutzer, Schweregrad-Badge, Zeit, Chevron.
- **Aufgeklappt** zeigt:
  - **Was ist passiert** (Klartext-Beschreibung — heute steht da z. B. nur „TypeError: …", neu z. B. „Beim Laden des Chats ist die Verbindung zum Server abgebrochen.").
  - Betroffener Nutzer mit Telefonnummer, Route, Gerät/Plattform, Häufigkeit + Zeitfenster.
  - Admin-Notiz (editierbar) und Aktionen (geprüft / gelöst / löschen / Ticket exportieren).
  - **Technische Details** als verschachtelter Akkordeon-Eintrag (Stack-Trace + JSON wie heute).
- Mapping `errorTypeToHumanText(title, message, category)` für die Klartext-Zeile (Wörterbuch + Heuristik analog zu `ACTION_LABELS` im Audit-Log).
- Kompaktdarstellung nutzt `Collapsible` aus `components/ui/collapsible.tsx`.

---

## Sichtbare Änderungen für dich

- Admin-Sidebar: zusätzlicher Tab **„Aktivitäten"** zwischen Fehler und Audit-Log.
- Tab **„Fehler"**: Liste deutlich aufgeräumter, jede Zeile aufklappbar, Klartext zuerst, technische Details nur auf Wunsch sichtbar.
- Tab **„Aktivitäten"**: Zeitleiste à la „Sabine hat sich angemeldet · vor 2 Min.", aufklappbar für Details (Plan, Quelle, Metadaten).

---

## Technische Notizen

- Migration: neue Tabelle, RLS, Indizes (`created_at desc`, `user_id`, `event_type`), 4 Trigger, 1 RPC.
- Backfill optional: einmaliges Insert von `signup`-Events aus bestehenden `profiles.created_at` und `premium_activated` aus `subscriptions` mit Plan ≠ free.
- Edge Function `delete-account`: zusätzlicher Insert in `user_activity_log` vor dem Löschen (mit Snapshot-Name in Metadata, da Profile danach weg).
- Keine neuen Secrets nötig.