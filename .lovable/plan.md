## Plan: Voice-Sicherheit jetzt umsetzen

Wir starten mit dem Sicherheitsblock für geklonte Stimmen. Die Hetzner-Speicherung der Stimmdateien bleibt wie besprochen für morgen.

## Ziel

Echte geklonte Nutzerstimmen dürfen nur noch verwendet werden, wenn der Besitzer der Stimme es erlaubt hat. Standard-Stimmen bleiben weiterhin nutzbar.

## Umsetzung

1. **TTS-Backend absichern**
   - In `voice-tts` und `voice-tts-stream` prüfen:
     - Wenn der Nutzer seine eigene Stimme abspielt: erlaubt.
     - Wenn eine Standard-Stimme genutzt wird: erlaubt.
     - Wenn eine fremde geklonte Stimme genutzt wird: nur erlaubt bei `voice_consents.status = 'granted'`.
   - Eine gemeinsame Unterhaltung reicht dann nicht mehr aus, um eine echte geklonte Stimme zu verwenden.

2. **Fallback-Verhalten sauber halten**
   - Wenn keine Freigabe vorhanden ist, wird nicht heimlich die fremde geklonte Stimme genutzt.
   - Stattdessen wird die Standard-TTS-Stimme genutzt oder ein klarer Fehlercode zurückgegeben, je nachdem was im bestehenden Chat-Flow besser passt.

3. **Voice-Freigabe-Status klarer machen**
   - In der Voice-UI anzeigen, dass Kontakte die echte Stimme nur mit Freigabe hören dürfen.
   - Bestehende Freigaben bleiben verwaltbar: erlauben, ablehnen, widerrufen/löschen.

4. **Löschung sauberer machen**
   - Beim Löschen der eigenen Stimme zusätzlich sicherstellen, dass zugehörige Freigaben nicht weiter als aktiv wirken.
   - Der Nutzer sieht weiterhin den Hinweis, dass gespeicherte Stimme und Voice-Cloning-Profil entfernt werden.

5. **Sicherheitsprüfung danach**
   - Typecheck/Test ausführen.
   - Security-Scan prüfen.
   - Falls der Scanner neue relevante Hinweise meldet, direkt beheben oder sauber begründen.

## Nicht Teil dieses Blocks

- Hetzner Object Storage / S3-Anbindung.
- Migration bestehender Stimmdateien zu Hetzner.
- komplette Datenbank-/Chat-/Auth-Migration.

Das machen wir danach separat, damit die sicherheitskritische Voice-Freigabe zuerst stabil ist.