## Befund zur bestehenden Datenbank

Die `messages`-Tabelle existiert mit u.a. diesen relevanten Spalten:
- `message_type text default 'text'` — Sprachnachrichten haben `'audio'`
- `audio_url text` — Pfad zur Audiodatei (Storage)
- `content text not null` — bei Audio aktuell die Audio-URL (vom bestehenden Code so genutzt)

Es gibt bereits eine Edge Function `transcribe` (ElevenLabs, einmalige Inline-Transkription bei Aufnahme, kein DB-Persistieren). Diese bleibt unangetastet — wir bauen additiv die zweite, persistente On-Demand-Variante.

**Keine Umbenennung**, keine Datenmigration. Nur neue Spalten.

## 1. Geänderte/neue Dateien

| Datei | Art | Zweck |
|---|---|---|
| `supabase/functions/transcribe-voice-message/index.ts` | neu | Edge Function (Auth, Berechtigung, Status-Updates, Stub-Abbruch wenn Secrets fehlen) |
| `src/components/chat/ChatBubble.tsx` | geändert | UI-Block für die 4 Status (none/processing/completed/failed) unterhalb des Audio-Players |
| `src/pages/ChatPage.tsx` | geändert | Nachrichten-Query und Realtime-Mapping um neue Felder erweitern; Props an `ChatBubble` durchreichen; Invoke-Handler `onTranscribe(msgId)` |
| `src/integrations/supabase/types.ts` | auto | wird nach Migration automatisch regeneriert |

Keine Änderungen an: Auth, Push, Calls, Premium, Voice-Cloning, bestehender `transcribe`-Funktion, AudioPlayer.

## 2. Datenbankmigration (additiv)

```sql
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS audio_transcript text,
  ADD COLUMN IF NOT EXISTS audio_transcript_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS audio_transcript_language text,
  ADD COLUMN IF NOT EXISTS audio_transcript_provider text DEFAULT 'self_hosted_faster_whisper',
  ADD COLUMN IF NOT EXISTS audio_transcript_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds integer;

-- Validierungs-Trigger (statt CHECK, damit zukünftig erweiterbar)
CREATE OR REPLACE FUNCTION public.validate_audio_transcript_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.audio_transcript_status NOT IN ('none','processing','completed','failed') THEN
    RAISE EXCEPTION 'invalid audio_transcript_status: %', NEW.audio_transcript_status;
  END IF;
  RETURN NEW;
END$$;

CREATE TRIGGER trg_validate_audio_transcript_status
BEFORE INSERT OR UPDATE OF audio_transcript_status ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.validate_audio_transcript_status();
```

RLS bleibt wie sie ist — die Edge Function schreibt mit Service Role; Leser sehen die neuen Spalten automatisch über die bestehenden `Members can read messages`-Policies.

**Wichtig zur bestehenden Edit-Policy:** `Sender can edit own messages` erlaubt nur 15 Min und nicht gelesen. Da die Edge Function via Service Role schreibt, wird RLS umgangen — kein Konflikt.

## 3. UI-Änderung in `ChatBubble.tsx`

Direkt unter dem `<AudioPlayer>`-Block (nur wenn `isAudio && !isUploading`), neue Props:
- `audioTranscript?: string`
- `audioTranscriptStatus?: 'none'|'processing'|'completed'|'failed'|null`
- `onTranscribe?: (msgId: string) => void`

Render-Logik:
- `none`/null → Button „In Text umwandeln" (klein, dezent, gleicher Stil wie der „Anhören"-Chip)
- `processing` → Text „Transkript wird erstellt …" mit Loader
- `completed` → Transkript-Text + kleiner Hinweis „Automatisch erstellt – kann Fehler enthalten."
- `failed` → „Transkription fehlgeschlagen – erneut versuchen" + Retry-Button

Bestehende `transcription`-Prop bleibt unverändert (wird vom Aufnahme-Flow gefüllt) und wird weiterhin separat angezeigt; die neuen Felder sind orthogonal dazu.

## 4. Edge Function `transcribe-voice-message`

```
POST /functions/v1/transcribe-voice-message
Body: { "message_id": "<uuid>" }
```

Ablauf:
1. CORS-Preflight
2. `Authorization`-Header prüfen → `supabase.auth.getUser()` → 401 wenn fehlt
3. Zod-Validation von `message_id`
4. Service-Role-Client laden, `messages` per id selektieren
5. Per `is_conversation_member(conversation_id, user.id)` RPC prüfen → sonst 403
6. Prüfen: `message_type = 'audio'` und `audio_url` vorhanden → sonst 400
7. Wenn `audio_duration_seconds > 120` → 413
8. Status-Guard: wenn bereits `processing` oder `completed` → 409 (idempotent, keine Doppel-Jobs)
9. `audio_transcript_status = 'processing'` setzen
10. Secrets-Check: `SELF_HOSTED_STT_URL` und `SELF_HOSTED_STT_SECRET` lesen
    - Fehlt eines → Status zurück auf `'failed'`, **kein** Löschen von Nachricht/Audio, Response 503: `{ error: "Transkriptionsserver ist noch nicht verbunden." }`
11. (Platzhalter-Kommentar für späteren Hetzner-Aufruf — bleibt in diesem Schritt unimplementiert)

Logging: nur `message_id` + Statusübergänge, **niemals** Audio-URL, Audio-Inhalt oder Transkript.

Config: `verify_jwt = false` (Standard); Auth wird im Code geprüft. Kein Eintrag in `supabase/config.toml` nötig.

## 5. Secrets (später vom Nutzer zu setzen)

- `SELF_HOSTED_STT_URL` = `https://api.clemio.app/transcribe`
- `SELF_HOSTED_STT_SECRET` = `<vom Nutzer generiert>`

In diesem Schritt werden sie **nicht** angefragt — die Function liefert bewusst 503, bis sie vorhanden sind.

## 6. Tests nach Umsetzung

1. **Migration**: `supabase--read_query` → `\d messages` zeigt die 6 neuen Spalten und der Trigger existiert.
2. **Edge Function deployment**: `supabase--deploy_edge_functions ["transcribe-voice-message"]` erfolgreich.
3. **Auth-Test**: `curl_edge_functions` ohne Auth → 401.
4. **Validation**: mit Auth aber `message_id: "abc"` → 400.
5. **Berechtigung**: mit Auth, fremde `message_id` → 403.
6. **Falscher Typ**: Text-Nachricht-ID → 400.
7. **Happy-Stub-Path**: eigene Audio-Nachricht → Response 503 „Transkriptionsserver ist noch nicht verbunden.", `read_query` zeigt `audio_transcript_status='failed'`, Nachricht und `audio_url` unverändert.
8. **UI-Smoke (Browser-Preview)**: Sprachnachricht zeigt Button → Klick → kurzer `processing`-Zustand → `failed` mit Retry sichtbar. Bestehende Audio-Wiedergabe, Reactions, Reply, Edit-Fenster, Push, Calls funktionieren unverändert.
9. **Regression**: bestehende `transcribe`-Function (ElevenLabs Inline-Transkript bei Aufnahme) ungetestet aber unverändert — kurzer Aufnahme-Test bestätigt, dass Inline-Transkript weiter erscheint.

**STATUS**
- Plan: fertig.
- Umsetzung: wartet auf deine Bestätigung.