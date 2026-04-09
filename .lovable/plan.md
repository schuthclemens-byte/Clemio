

## Plan: 3 Architektur-Verbesserungen umsetzen

### 1. Profil-Zugriff in `notify-incoming-call` bereinigen
- Die Edge Function liest bereits nur `display_name` aus `profiles` (kein `phone_number`-Fallback mehr vorhanden)
- **Ergebnis**: Bereits sauber, keine Änderung nötig

### 2. Voice-Consent Unique-Index absichern
- Migration: `CREATE UNIQUE INDEX` auf `voice_consents(voice_owner_id, granted_to_user_id)` hinzufügen
- Die RPC `request_voice_consent` prüft bereits Duplikate und Self-Requests — der Index ist die DB-seitige Absicherung

### 3. `messages` UPDATE-Policy für Lesebestätigungen reparieren
- Aktuell kann nur der Sender Nachrichten updaten (für Edit innerhalb 15 Min)
- Aber `mark_messages_read` nutzt `SECURITY DEFINER`, daher funktioniert `is_read`-Update trotzdem
- Empfänger können `is_read` jedoch nicht direkt per Client setzen — prüfen ob das benötigt wird und ggf. eine separate UPDATE-Policy für `is_read` auf Empfängerseite hinzufügen

### Technische Details

**Migration SQL:**
```sql
-- Unique index for voice_consents to prevent duplicate requests at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_consents_pair 
ON public.voice_consents (voice_owner_id, granted_to_user_id);
```

**Dateien die geändert werden:**
- Neue Migration für den Unique-Index
- Keine Code-Änderungen nötig (RPC + Edge Functions sind bereits korrekt)

