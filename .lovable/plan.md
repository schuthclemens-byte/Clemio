

## Plan: Stimmaufnahme verschlüsselt hochladen + neutrale DB-Anzeige

### Problem
Aktuell wird die Aufnahme als Klartext-`.wav` unter `{user_id}/{user_id}.wav` hochgeladen. Im Backend ist die Datei direkt abspielbar und der Pfad steht sichtbar in `profiles.voice_path`.

### Ziel
- Die Aufnahme wird **im Browser mit AES-256-GCM verschlüsselt**, bevor sie hochgeladen wird
- Im Storage liegt nur ein unlesbarer `.enc`-Blob
- In `profiles.voice_path` steht **nur ein neutraler Marker** (z.B. `"uploaded"`) — kein Dateipfad
- In der UI zeigt die Karte den **Namen des Nutzers** und **"Stimmaufnahme"** statt des Pfads

### Änderungen in `src/pages/ProfilePage.tsx`

**1. Recording-Handler (`recorder.onstop`, Zeile 250–291):**
- Nach dem Stoppen: AES-256-GCM Key generieren oder bestehenden wiederverwenden (`voiceEncKey`)
- Blob mit `encryptVoiceFile()` verschlüsseln
- Upload als `${user.id}.enc` (nicht mehr `${user.id}/${user.id}.wav`)
- `voice_path` in DB auf `"uploaded"` setzen (kein Dateipfad)
- `voice_encryption_key` speichern

**2. Voice-Karte (Zeile 582–603):**
- Statt `{voicePath}` → `{firstName} {lastName}` (Fallback: "Meine Stimme")
- Statt `{t("profile.voiceSaved")}` → `"Stimmaufnahme"` / `"Voice Recording"`

**3. Delete-Handler (Zeile 302–315):**
- Bereits korrekt: löscht `.enc` und setzt `voice_path: null`

**4. Play-Handler (Zeile 317–350):**
- Bereits korrekt: lädt `.enc`, entschlüsselt im Browser

### Ergebnis

| Vorher | Nachher |
|--------|---------|
| `stimmen/{id}/{id}.wav` (Klartext) | `stimmen/{id}.enc` (AES-256-GCM) |
| `voice_path = "{id}/{id}.wav"` | `voice_path = "uploaded"` |
| UI zeigt Dateipfad | UI zeigt "Max Mustermann — Stimmaufnahme" |

