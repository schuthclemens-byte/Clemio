## Kurzfazit

Die zuletzt geladene Sicherheitsprüfung zeigt aktuell keine offenen kritischen Findings. Der Datenbank-Linter meldet aber noch 19 Warnungen rund um `SECURITY DEFINER`-Funktionen. Viele davon sind wahrscheinlich bewusst nötig, sollten aber explizit gehärtet werden, damit nur die wirklich benötigten Rollen/Funktionen ausführbar bleiben.

Zusätzlich sehe ich mehrere sinnvolle Stabilitäts- und Sicherheitsverbesserungen, die Clemio robuster machen würden.

## Empfohlene nächste Schritte

### 1. Backend-Funktionsrechte weiter einschränken

- Alle `SECURITY DEFINER`-Funktionen inventarisieren.
- Für jede Funktion festlegen:
  - öffentlich nötig,
  - nur eingeloggte Nutzer,
  - nur Admins,
  - nur Backend-Service,
  - oder gar nicht direkt per API aufrufbar.
- Migration erstellen, die `EXECUTE` standardmäßig von `PUBLIC`/`anon` entzieht und nur gezielt wieder vergibt.
- Besonders prüfen:
  - Queue-/Mail-Funktionen wie `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`
  - Trigger-only-Funktionen wie `notify_new_message`, `notify_admin_on_report`, `handle_new_subscription`
  - administrative oder sensible RPCs.

Ziel: Weniger Angriffsfläche und weniger Linter-Warnungen.

### 2. Admin-Funktion `admin-manage-user` absichern und stabilisieren

Die Funktion ist mächtig, weil sie Nutzer sperren, löschen, Passwörter setzen und Reports verwalten kann. Ich würde sie weiter härten:

- Request-Body serverseitig mit klaren erlaubten Actions validieren.
- Eingaben wie `targetUserId`, `reportId`, `errorId`, `plan`, `status`, `premiumUntil`, `newPassword` prüfen.
- Keine sensiblen internen Fehlermeldungen an den Client zurückgeben; intern loggen, extern neutrale Meldung.
- Admin-Aktionen in eine Audit-Tabelle schreiben:
  - Admin-ID
  - Aktion
  - Zielnutzer oder Report-ID
  - Zeitpunkt
  - Ergebnis
- Für besonders gefährliche Aktionen wie Nutzer löschen oder Passwort resetten zusätzliche Schutzregeln einbauen, z. B. kein Löschen anderer Admins ohne separate Prüfung.

Ziel: Bessere Nachvollziehbarkeit und weniger Risiko bei Admin-Bedienfehlern.

### 3. Rollenprüfung im Frontend robuster machen

Aktuell prüft `useAdminRole` direkt `user_roles`. Das ist durch RLS geschützt, aber aus Stabilitäts-/Sicherheitsgründen besser über eine kleine sichere RPC-Funktion:

- Neue RPC `get_my_roles()` oder `is_current_user_admin()`.
- Frontend nutzt diese statt direktem Tabellenzugriff.
- Optional: Admin-Seiten zeigen bei Fehlern einen neutralen Zustand und retry statt falschem Admin/Non-Admin-Flackern.

Ziel: Weniger direkte Rollen-Tabellenzugriffe und klarere Admin-Gates.

### 4. Fehler-Übersicht produktionsreifer machen

Die neue Fehler-Übersicht kann noch stabiler werden:

- Serverseitige Suche/Filterung statt nur 200 neueste Fehler zu laden.
- Pagination oder „Mehr laden“.
- Query-Parameter: Status, Schwere, Suchtext.
- Debounce für Suche.
- Indizes auf `status`, `severity`, `last_seen_at`, optional Textsuche auf `title/message`.
- Fehlergruppen besser zusammenführen, z. B. Fingerprint aus Route + Titel + normalisierter Message.

Ziel: Admin bleibt schnell, auch wenn viele Fehlerberichte entstehen.

### 5. Client-Error-Logging datenschutzfreundlicher machen

Fehlerberichte können versehentlich sensible Inhalte enthalten. Ich würde ergänzen:

- Redaction vor Speicherung:
  - Telefonnummern maskieren
  - E-Mails maskieren
  - Tokens/JWTs/API-Keys entfernen
  - sehr lange Stacktraces begrenzen
- Allowlist für `details`, damit nicht beliebige App-Daten gespeichert werden.
- Rate-Limit pro Nutzer/Fingerprint verschärfen, damit Fehler-Loops die Datenbank nicht fluten.

Ziel: Bessere Privatsphäre und weniger Error-Spam.

### 6. Storage und Medien-Uploads weiter absichern

Die Policies sind schon deutlich strenger geworden. Sinnvolle nächste Härtung:

- Dateityp- und Größenregeln clientseitig und serverseitig dokumentieren/erzwingen, soweit möglich.
- Chat-Media-Pfade konsequent validieren:

```text
chat-media/{ownerUserId}/{conversationId}/{fileName}
stimmen/{ownerUserId}/{fileName}
voice-samples/{ownerUserId}/{fileName}
```

- Admin-/Cleanup-Flow für verwaiste Medien ergänzen.
- Upload-Fehler besser abfangen und retry-fähig machen.

Ziel: Weniger kaputte Uploads, weniger verwaiste Dateien, weniger Risiko durch falsche Pfade.

### 7. Edge Functions einheitlich auf moderne Auth-Prüfung bringen

Einige Backend-Funktionen verwenden noch `getUser()`. Für viele Fälle ist eine reine Token-Claims-Prüfung schneller und stabiler.

- Funktionen prüfen und vereinheitlichen:
  - `check-subscription` nutzt bereits Claims.
  - andere Funktionen wie TTS, Voice Clone, Translate, TURN prüfen.
- Wo keine vollständigen Userdaten nötig sind, `getClaims()` verwenden.
- Überall einheitliche Antwortstruktur:

```text
401 Unauthorized
403 Forbidden
400 Invalid request
429 Rate limited
500 Internal error
```

Ziel: Schnellere Funktionen, weniger uneinheitliche Fehlerfälle.

### 8. CI-/Regression-Schutz erweitern

Es gibt bereits Scripts für Security-Scan und RLS-Matrix. Ich würde sie erweitern:

- Security-Scan erweitert um:
  - direkte `profiles`-Reads mit sensiblen Feldern
  - Edge Functions, die Service Role verwenden ohne Auth-Check
  - öffentliche Funktionen ohne explizite Permission-Entscheidung
- RLS-Matrix um neue Tabellen ergänzen:
  - `app_error_reports`
  - `app_versions`
  - `calls`
  - `user_presence`
  - `voice_secrets`
  - `email_*` Tabellen
- Tests für Admin Error Reports:
  - Statusfilter
  - Schwerefilter
  - Suche
  - leere Ergebnisse
  - Lade-/Fehlerzustände.

Ziel: Neue Änderungen brechen Sicherheit und Admin-Flows nicht unbemerkt.

## Priorisierung

### Hohe Priorität
1. `SECURITY DEFINER`-Rechte auditieren und per Migration härten.
2. `admin-manage-user` validieren, neutralere Fehler, Audit-Log.
3. Error-Logging redaction/rate-limit verbessern.

### Mittlere Priorität
4. Admin-Fehlerliste serverseitig filter-/such-/paginierbar machen.
5. Admin-Rollencheck über RPC kapseln.
6. Edge Function Auth vereinheitlichen.

### Danach
7. Storage-Cleanup und Upload-Robustheit.
8. CI-Security-Scripts und Tests erweitern.

## Technische Umsetzung nach Freigabe

Ich würde zuerst ein kompaktes Hardening-Paket umsetzen:

1. Migration für Funktionsrechte und optional `admin_audit_log`.
2. `admin-manage-user` mit serverseitiger Validierung und Audit-Logging refactoren.
3. `appErrorLogging` um Redaction und strengere Payload-Grenzen ergänzen.
4. Admin-Error-Reports auf serverseitige Filter/Search/Pagination vorbereiten.
5. Security-Scan/RLS-Scripts um die neuen Regeln erweitern.
6. Relevante Tests ergänzen bzw. bestehende Tests anpassen.

Dabei würde ich keine bestehenden Kernfeatures entfernen, sondern die vorhandenen Flows schrittweise absichern und stabilisieren.