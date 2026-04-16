

## Plan: Bestehende Stimmdatei serverseitig in Root verschieben

### Problem
Die alte `.wav`-Datei liegt im verschachtelten Pfad `{user_id}/{user_id}.wav`. Die neue Upload-Logik speichert als `{user_id}.enc` im Root, aber die bestehende Datei wurde nie migriert, weil die Auto-Migration nur beim Öffnen der Profilseite läuft.

### Lösung
Die Frontend-Auto-Migration beibehalten (für andere Nutzer), aber **zusätzlich jetzt einmalig die bestehende Datei manuell migrieren**:

1. **Profilseite öffnen** → Die Auto-Migration wird ausgelöst:
   - Lädt die alte `.wav` per Signed URL
   - Verschlüsselt sie mit AES-256-GCM
   - Lädt sie als `{user_id}.enc` in den Root hoch
   - Aktualisiert `voice_path` und `voice_encryption_key` in der DB
   - Löscht die alte verschachtelte Datei

2. **Logging verbessern** → Falls die Migration fehlschlägt, sehen wir den Grund in der Konsole. Aktuell werden Fehler still verschluckt (`if (!data?.signedUrl) return;`). Ich füge aussagekräftige `console.warn`-Meldungen hinzu.

3. **Fallback**: Falls die Signed URL für den alten Pfad nicht funktioniert (RLS-Problem), passe ich den Migrationscode an, den alten Ordner-basierten Pfad korrekt zu verwenden.

### Änderungen
- `src/pages/ProfilePage.tsx`: Logging in der Auto-Migration ergänzen, damit Fehler sichtbar werden
- Kein neuer Backend-Code nötig – die RLS-Policies erlauben bereits beides (Ordner + Root)

### Ergebnis
Nach dem Öffnen der Profilseite:
- Datei `{user_id}.enc` im Root des `stimmen`-Buckets sichtbar
- Alte verschachtelte Datei gelöscht
- `profiles.voice_path` = `{user_id}.enc`
- `profiles.voice_encryption_key` = Base64-AES-Key

