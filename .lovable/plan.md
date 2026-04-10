

## Plan: Verbesserungen ohne Domain/E-Mail

Die App ist bereits sehr vollständig. Die Sicherheits-Scans zeigen keine offenen Probleme. Folgende Verbesserungen kann ich ohne Domain umsetzen:

### 1. Client-seitiges Rate Limiting für Login/Registrierung
Aktuell gibt es kein Rate Limiting — ein Angreifer könnte unbegrenzt Login-Versuche starten.

- **LoginPage.tsx**: Login-Versuche zählen und nach 5 Fehlversuchen den Button für 30 Sekunden sperren (mit Countdown-Anzeige)
- Verhindert Brute-Force-Angriffe auf der Client-Seite

### 2. Sende-Sound für ausgehende Nachrichten
Eingehende Nachrichten haben bereits einen Ton (`playMessageTone`), aber beim Senden gibt es keinen Sound.

- **sounds.ts**: Neue Funktion `playSendTone()` — kurzer "Whoosh"-Sound
- **ChatPage.tsx**: `playSendTone()` in `handleSend` aufrufen

### 3. Nachrichten-Sende-Rate-Limiting
Kein Schutz gegen Spam — ein Nutzer könnte hunderte Nachrichten pro Sekunde senden.

- **ChatPage.tsx**: Nachrichten auf max. 1 pro Sekunde begrenzen, bei zu schnellem Senden Toast-Warnung anzeigen

---

### Technische Details

| Datei | Änderung |
|---|---|
| `src/pages/LoginPage.tsx` | Login-Attempt-Counter + 30s Cooldown nach 5 Fehlversuchen |
| `src/lib/sounds.ts` | `playSendTone()` Funktion hinzufügen |
| `src/pages/ChatPage.tsx` | Send-Sound + Message-Throttle (1/Sek) |

Keine Datenbank-Änderungen nötig.

