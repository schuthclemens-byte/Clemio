
Zustand jetzt:
- Das Problem ist sehr wahrscheinlich nicht dein hochgeladenes Stimmprofil, sondern der TTS-Aufruf selbst.
- Die Backend-Logs zeigen für `voice-tts-stream` und `onboarding-tts` mehrfach: `quota_exceeded` und `You have 0 credits remaining`.
- Genau für diesen Fehler hat `src/hooks/useVoiceTTS.ts` aktuell einen Fallback auf `window.speechSynthesis` eingebaut. Deshalb hörst du bei `test` die schlechte Computerstimme statt der geklonten Stimme von `clemens`.

Warum das passiert:
- In `useVoiceTTS.ts` wird bei jedem Fehler in der TTS-Generierung automatisch Browser-TTS gestartet.
- Der Chat versucht also korrekt die geklonte Stimme zu laden, bekommt aber vom TTS-Dienst einen Quota-Fehler und springt dann auf Robotersprache um.
- Zusätzlich verbraucht die Landingpage im Hintergrund ebenfalls TTS über `onboarding-tts`, was das Kontingent zusätzlich belasten kann.
- In `ChatPage.tsx` wird außerdem die Voice-Verfügbarkeit direkt über `voice_profiles` geprüft statt über die vorhandene RPC für zugängliche Voice-States. Das ist nicht die Hauptursache für die Roboterstimme, sollte aber bereinigt werden.

Umsetzungsplan:
1. `useVoiceTTS.ts` anpassen:
   - Quota-/Provider-Fehler sauber erkennen
   - bei `quota_exceeded` nicht mehr automatisch Browser-TTS starten
   - stattdessen klare Meldung anzeigen wie „Deine geklonte Stimme ist gerade nicht verfügbar“
   - Browser-TTS nur noch als bewusste, getrennte Fallback-Option verwenden

2. `voice-tts-stream` verbessern:
   - ElevenLabs-Fehler strukturierter an den Client zurückgeben, z. B. `code: quota_exceeded`
   - optional zwischen `quota_exceeded`, `unauthorized`, `forbidden`, `tts_failed` unterscheiden
   - damit der Client gezielt reagieren kann statt immer still auf Roboterstimme zu wechseln

3. `ChatPage.tsx` bereinigen:
   - Voice-Status nicht mehr per direkter `voice_profiles`-Abfrage laden
   - stattdessen die vorhandene `get_accessible_voice_profile_states`-RPC bzw. `fetchAccessibleVoiceProfileStates` verwenden
   - so ist die Anzeige konsistent zwischen Accounts und Zugriffsregeln

4. Landingpage-Kosten reduzieren:
   - `onboarding-tts`/`HeroSection.tsx` so ändern, dass nicht unnötig bei jedem Laden neuer TTS-Verbrauch entsteht
   - bevorzugt vorhandene statische Demo-Audio oder aggressiver Cache
   - verhindert, dass Demo-Audio das Stimmen-Kontingent mit verbraucht

5. UX im Chat verbessern:
   - falls keine echte geklonte Stimme verfügbar ist, Button-Zustand oder Hinweistext anpassen
   - optional zwei getrennte Aktionen:
     - „In echter Stimme anhören“
     - „Mit Computerstimme anhören“
   - dann ist für Nutzer klar, was gerade abgespielt wird

Erwartetes Ergebnis:
- Wenn TTS-Kontingent leer ist, hörst du nicht mehr irreführend die Roboterstimme als stillen Ersatz.
- Stattdessen siehst du einen klaren Hinweis, warum die echte Stimme nicht abgespielt werden kann.
- Sobald wieder Kontingent verfügbar ist oder bereits gecachte Audio-Dateien existieren, wird wieder die echte geklonte Stimme abgespielt.

Technische Kernursache:
```text
Chat klickt auf "Anhören"
-> voice-tts-stream wird aufgerufen
-> Provider antwortet mit quota_exceeded
-> useVoiceTTS catch() greift
-> Browser speechSynthesis startet
-> Ergebnis: schlechte Computerstimme
```
