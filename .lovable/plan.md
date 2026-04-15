
# Onboarding-TTS Audio in Storage cachen

## Problem
Jeder Seitenaufruf verbraucht ElevenLabs-Credits für dieselben 6 festen Texte. Mit 40.000 Credits ist genug vorhanden — aber es soll trotzdem nur einmal pro Sprache generiert werden.

## Änderung

### `supabase/functions/onboarding-tts/index.ts`
- Supabase Admin-Client erstellen (Service Role Key)
- Vor ElevenLabs-Aufruf: `tts-cache/onboarding/{lang}_{hash}.mp3` aus Storage prüfen
- **Cache Hit** → Audio direkt aus Storage zurückgeben (0 Credits)
- **Cache Miss** → ElevenLabs aufrufen → Audio in `tts-cache` speichern → zurückgeben
- `Cache-Control: public, max-age=86400` Header setzen
- Hash basiert auf dem Text, damit bei Textänderungen automatisch neu generiert wird

### Kein Client-Änderung nötig
- `HeroSection.tsx` ruft weiterhin denselben Endpoint auf
- Antwort bleibt `audio/mpeg`

## Ablauf
```text
Anfrage: onboarding-tts?lang=es
  → Hash berechnen
  → Storage: tts-cache/onboarding/es_{hash}.mp3?
    JA  → direkt zurückgeben (0 Credits)
    NEIN → ElevenLabs API → in Storage speichern → zurückgeben
```

## Ergebnis
- 6 Sprachen × 1 Aufruf = max ~780 Credits einmalig
- Alle weiteren Aufrufe: 0 Credits
