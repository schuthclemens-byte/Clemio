
Ziel: Den .wav-Upload auf der Profilseite so korrigieren, dass die Datei wirklich im privaten Storage-Bucket landet und nur dann ein Erfolg angezeigt wird, wenn der Upload vom Backend bestätigt wurde.

1. Befund
- Betroffen ist laut deiner Antwort der `.wav`-Upload auf der Profilseite.
- Im Backend existiert aktuell genau ein passender privater Bucket: `stimmen` (kleines `s`).
- Im Code (`src/pages/ProfilePage.tsx`) nutzt der Stimmdatei-Upload aktuell `supabase.storage.from("Stimmen")`.
- Bucket-Namen sind case-sensitive.
- Zusätzlich wird in `handleVoiceUpload` der Rückgabefehler des Uploads zwar gespeichert (`uploadErr`), aber nicht geprüft. Dadurch kann:
  - der Storage-Upload fehlschlagen
  - `voice_path` trotzdem in der Datenbank gesetzt werden
  - die UI trotzdem “erfolgreich” anzeigen

STATUS: Ursache identifiziert. Fertig: ja

2. Beweis aus der Analyse
- Backend-Bucket vorhanden: `stimmen`
- Im Storage liegt bereits ein Objekt in diesem Bucket:
  `49a49e20-3c9f-4728-8672-46a3b7a6465a/49a49e20-3c9f-4728-8672-46a3b7a6465a.wav`
- Das bedeutet:
  - der echte Bucket heißt aktuell `stimmen`
  - wenn du nach `Stimmen` suchst, wirst du dort nichts finden
  - der aktuelle Code kann wegen des Namens-Mismatches fehlschlagen

STATUS: Beweis dokumentiert. Fertig: ja

3. Geplanter Fix
- In `src/pages/ProfilePage.tsx` nur die Stimmdatei-Funktionen auf den tatsächlich vorhandenen Bucket `stimmen` umstellen:
  - Upload
  - Signed URL zum Abspielen
  - Delete
- `handleVoiceUpload` korrekt absichern:
  - `await supabase.storage.from("stimmen").upload(...)`
  - `uploadErr` sofort prüfen
  - bei Fehler: `console.error(...)` + Toast-Fehler + kein DB-Update
  - nur bei echtem Upload-Erfolg: `profiles.voice_path` setzen
  - Erfolgstoast nur nach erfolgreichem Storage-Upload und erfolgreichem DB-Update
- Zusätzliche Debug-Ausgaben:
  - Bucket-Name
  - Pfad
  - Upload-Fehlerobjekt
  - bestätigte Upload-Antwort

STATUS: Fix-Plan definiert. Fertig: ja

4. Wichtige Abgrenzung
- Ich würde nicht blind “alle `from("Stimmen")`” im File ersetzen.
- Im selben File gibt es auch einen separaten Avatar-Fehler, der nicht zu diesem .wav-Problem gehört.
- Für dein aktuelles Problem ändere ich gezielt nur den Voice-File-Flow, damit keine Nebenfehler entstehen.

STATUS: Scope abgegrenzt. Fertig: ja

5. Test nach Umsetzung
- Test A: `.wav` auf Profilseite hochladen
  - Erwartung: Erfolg nur bei bestätigtem Storage-Upload
- Test B: Storage prüfen
  - Erwartung: Datei liegt unter `{user.id}/{user.id}.wav` im Bucket `stimmen`
- Test C: “Stimme anhören”
  - Erwartung: Signed URL wird erzeugt und Audio spielt ab
- Test D: Fehlerfall provozieren
  - Erwartung: kein Fake-Erfolg, sondern sichtbare Fehlermeldung + `console.error`
- Test E: Löschen
  - Erwartung: Objekt wird aus `stimmen` entfernt und `voice_path` wird auf `null` gesetzt

STATUS: Testplan vollständig. Fertig: ja

Technische Kurzfassung
```text
Ist:
Code nutzt      -> "Stimmen"
Backend hat      -> "stimmen"
Upload-Fehler    -> wird nicht abgefangen
Folge            -> Fake-Erfolg möglich

Soll:
Code nutzt      -> "stimmen"
Upload-Fehler    -> sofort behandeln
DB-Update        -> nur nach echtem Upload-Erfolg
UI-Erfolg        -> nur mit bestätigtem Storage-Upload
```

Nach Freigabe setze ich genau diesen Fix um.
