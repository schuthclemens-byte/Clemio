

# Serverseitiges Audio-Caching für TTS

## Was wird gemacht?
Generierte Sprachnachrichten werden serverseitig gespeichert, damit dieselbe Nachricht **nie doppelt** bei ElevenLabs generiert wird. Das spart ElevenLabs-Zeichen und die Stimme klingt **immer wie deine echte geklonte Stimme** – auch beim 100. Abspielen.

## Wie funktioniert es?

```text
Nutzer klickt "Anhören"
        │
        ▼
  Edge Function prüft:
  Gibt es schon eine cached MP3?
        │
   ┌────┴────┐
   Ja        Nein
   │         │
   │         ▼
   │    ElevenLabs generiert Audio
   │    (verbraucht Zeichen)
   │         │
   │         ▼
   │    Speichert MP3 in Storage
   │         │
   └────┬────┘
        ▼
  Sendet MP3 an App
  (klingt IMMER wie deine echte Stimme)
```

## Technische Schritte

### 1. Storage-Bucket erstellen
- Neuer privater Bucket `tts-cache` für die gecachten Audio-Dateien
- RLS: Nur Service-Role darf lesen/schreiben (Edge Function nutzt Admin-Client)

### 2. Edge Function `voice-tts-stream` erweitern
- **Cache-Key** berechnen: Hash aus `voiceId + text` → z.B. `a3f8b2c1.mp3`
- **Vor** dem ElevenLabs-Aufruf: Prüfen ob Datei in `tts-cache` existiert
  - **Ja** → Signierte URL erstellen und Audio direkt aus Storage zurückgeben
  - **Nein** → ElevenLabs aufrufen, Audio generieren, in Storage speichern, dann zurückgeben
- Streaming bleibt erhalten: Audio wird parallel gestreamt und gespeichert

### 3. Frontend (keine Änderungen nötig)
- Der Client-Code (`useVoiceTTS.ts`) bleibt unverändert – er ruft dieselbe Edge Function auf
- Der bestehende In-Memory-Cache im Browser funktioniert weiterhin als zusätzliche Ebene

## Ergebnis
- **Erste Wiedergabe**: ElevenLabs generiert → klingt wie deine Stimme → wird gespeichert
- **Jede weitere Wiedergabe**: Direkt aus Storage → klingt identisch → **0 Zeichen verbraucht**
- Deine 40.000 Zeichen/Monat reichen damit für deutlich mehr verschiedene Nachrichten

