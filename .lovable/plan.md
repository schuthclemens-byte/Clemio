

## Plan: Client-seitige Verschlüsselung der Stimmdatei

### Ziel
Die .wav-Datei wird **im Browser verschlüsselt**, bevor sie in den Bucket hochgeladen wird. Im Backend liegt nur ein unlesbarer verschlüsselter Blob. Abspielen funktioniert weiterhin in der App durch Entschlüsselung im Browser.

### Sicherheitsmodell
- **AES-256-GCM** Verschlüsselung im Browser (WebCrypto API, gleiche Technik wie bereits bei Biometrie im Projekt verwendet)
- Ein zufälliger Verschlüsselungsschlüssel wird pro Nutzer generiert und in einer neuen DB-Spalte `profiles.voice_encryption_key` gespeichert (Base64-kodiert)
- Die Datei im Bucket ist ohne diesen Schlüssel nicht abspielbar oder lesbar
- Der Schlüssel ist per RLS nur für den Eigentümer lesbar
- Im Bucket siehst du die Datei (z.B. `{user_id}.enc`), aber sie ist ohne App nicht abspielbar

**Wichtige Grenze**: Der Schlüssel liegt in der Datenbank, die per RLS geschützt ist. Das Backend (Service Role) könnte theoretisch darauf zugreifen. Für echte Zero-Knowledge-Verschlüsselung müsste der Schlüssel nur lokal gespeichert werden, was aber bedeutet: Gerät verloren = Datei verloren.

### Änderungen

**1. Migration** (neue Spalte + RLS-Anpassung)
- `profiles.voice_encryption_key` (text, nullable) hinzufügen
- Storage-RLS für `stimmen` anpassen: Root-Dateien erlauben (`{user_id}.enc`)

**2. ProfilePage.tsx** (Upload-Flow)
- Beim ersten Upload: AES-256-GCM Key generieren, in `profiles.voice_encryption_key` speichern
- `.wav` im Browser verschlüsseln (IV wird dem Ciphertext vorangestellt)
- Verschlüsselten Blob als `{user_id}.enc` in Bucket-Root hochladen
- `voice_path` auf `{user_id}.enc` setzen

**3. ProfilePage.tsx** (Playback-Flow)
- Verschlüsselte Datei per Signed URL laden
- Key aus `profiles.voice_encryption_key` lesen
- Im Browser entschlüsseln
- Audio-Blob abspielen

**4. ProfilePage.tsx** (Delete-Flow)
- `{user_id}.enc` aus Bucket löschen
- `voice_path` und `voice_encryption_key` auf null setzen

**5. Bestehende Datei migrieren**
- Falls bereits eine unverschlüsselte `.wav` existiert: beim nächsten Seitenaufruf automatisch verschlüsseln und ersetzen

### Was du danach im Backend siehst
- Bucket `stimmen` → Datei `{user_id}.enc` direkt im Root sichtbar
- Datei ist nicht abspielbar ohne den Schlüssel aus der App

### Kein Download-Button
Die App bietet bewusst keinen Download an. Abspielen nur innerhalb der App.

```text
Ist:
  Upload   → Klartext .wav in {user_id}/{user_id}.wav
  Backend  → Datei direkt abspielbar
  Bucket   → leer aussehend (verschachtelt)

Soll:
  Upload   → AES-256-GCM verschlüsselt als {user_id}.enc im Root
  Backend  → Datei nicht abspielbar (verschlüsselter Blob)
  Bucket   → Datei sichtbar, aber geschützt
  Playback → Entschlüsselung im Browser
```

