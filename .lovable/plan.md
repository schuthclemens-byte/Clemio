

## Plan: TTS-Wiedergabe sofort starten (Streaming-Playback)

### Problem
Aktuell wartet der Client auf den **kompletten** Audio-Download (`response.blob()`), bevor die Wiedergabe startet. Bei längeren Nachrichten dauert das mehrere Sekunden. Zusätzlich laufen die DB-Abfragen im Edge Function nacheinander statt parallel.

### Lösung: 3 Optimierungen

**1. Edge Function: Parallele DB-Abfragen + Latenz-Optimierung**
- Scope-Check und Voice-Profile-Lookup gleichzeitig ausführen (`Promise.all`) statt nacheinander → spart ~100-200ms
- ElevenLabs API-Parameter `optimize_streaming_latency=4` hinzufügen (maximale Latenz-Optimierung)
- Kleineres Ausgabeformat: `mp3_22050_32` statt `mp3_44100_128` → schnellere Generierung, kleinere Datei

**2. Client: Streaming-Playback mit MediaSource**
- Statt `response.blob()` abzuwarten, die Chunks via `ReadableStream` lesen
- `MediaSource` API nutzen um Audio abzuspielen sobald die ersten Bytes ankommen
- Fallback für Safari (kein MediaSource für MP3): Blob-basierte Wiedergabe beibehalten
- Ergebnis: Wiedergabe startet nach ~200-500ms statt nach dem kompletten Download

**3. Client: Preload sichtbarer Nachrichten**
- Wenn der Chat geöffnet wird, im Hintergrund TTS für die letzten 2-3 empfangenen Nachrichten vorladen
- Nutzt den bestehenden `ttsCache` → bei Tap ist das Audio sofort da

### Technische Änderungen

| Datei | Änderung |
|---|---|
| `supabase/functions/voice-tts-stream/index.ts` | `Promise.all` für DB-Queries, `optimize_streaming_latency=4`, Format auf `mp3_22050_32` |
| `src/hooks/useVoiceTTS.ts` | Neue `playStreaming()` Methode mit MediaSource + ReadableStream, Feature-Detection für Fallback |
| `src/pages/ChatPage.tsx` | Preload-Logik: letzte empfangene Nachrichten beim Chat-Öffnen im Hintergrund laden |

### Erwartetes Ergebnis
- Erste Audiowiedergabe: **unter 1 Sekunde** statt 2-4 Sekunden
- Cached Nachrichten: **sofort** (wie bisher)
- Spürbar flüssigeres Erlebnis beim Vorlesen

