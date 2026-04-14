

# Automatische Löschung alter TTS-Cache-Dateien nach 90 Tagen

## Übersicht
Eine Edge Function wird per Cron-Job täglich ausgeführt und löscht alle TTS-Cache-Dateien, die älter als 90 Tage sind.

## Technische Schritte

### 1. Edge Function `cleanup-tts-cache` erstellen
- Listet alle Dateien im `tts-cache` Storage-Bucket auf
- Prüft das `created_at`-Datum jeder Datei
- Löscht alle Dateien älter als 90 Tage
- Gibt eine Zusammenfassung zurück (Anzahl gelöschter Dateien)

### 2. Cron-Job einrichten
- Aktiviert die Extensions `pg_cron` und `pg_net` (falls nicht schon aktiv)
- Erstellt einen täglichen Cron-Job (z.B. 3:00 Uhr nachts), der die Edge Function aufruft

### 3. Sicherheit
- Die Function nutzt den Service-Role-Key für Storage-Zugriff
- Kein JWT erforderlich (wird nur vom Cron-Job aufgerufen)

## Ergebnis
- Jeden Tag werden automatisch Cache-Dateien gelöscht, die älter als 90 Tage sind
- Kein manueller Eingriff nötig
- Speicherplatz wird kontinuierlich freigehalten

