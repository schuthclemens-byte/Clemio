## Plan: Native Call-Untertitel erst per Admin-Schalter freigeben

Ziel: Die Untertitel-/Übersetzungsfunktion im Video-/Audio-Call soll in der App komplett verborgen bleiben, bis sie im Admin-Bereich aktiviert wird.

### 1. Globalen Feature-Schalter anlegen
- In der bestehenden `app_settings`-Struktur wird ein neuer Key genutzt, z. B. `call_captions`.
- Wert-Beispiel:
  ```json
  {
    "enabled": false,
    "native_only": true,
    "translation_enabled": true
  }
  ```
- Lesbar für eingeloggte Nutzer, änderbar nur durch Admins.
- Falls der Eintrag noch nicht existiert, wird er standardmäßig als deaktiviert behandelt.

### 2. Admin UI erweitern
- Im Admin-Bereich kommt eine neue Karte hinzu: `Call-Untertitel`.
- Schalter: `Live-Untertitel in der App aktivieren`.
- Status-Badge: `Aus`, `Aktiv`, optional `Native App only`.
- Kurzer Hinweistext: Die Funktion wird für normale Nutzer erst sichtbar, wenn der Schalter aktiv ist.

### 3. Call-Seite absichern
- `CallPage` lädt den globalen Feature-Status.
- Wenn `call_captions.enabled = false`:
  - Untertitel-Button wird nicht angezeigt.
  - Untertitel-Overlay wird nicht angezeigt.
  - keine Speech-/Caption-Logik startet.
- Wenn aktiviert:
  - Untertitel-Button erscheint wieder.
  - später kann dort die Sprachauswahl/Übersetzung eingebaut werden.

### 4. Vorbereitung für native iOS/Android-Umsetzung
- Die bisherige Browser-basierte `useLiveCaptions`-Logik bleibt als Fallback/alte Web-Logik erhalten, wird aber nicht mehr ungefragt im Call angezeigt.
- Für die native Umsetzung wird eine saubere Schnittstelle vorbereitet, damit später Android/iOS Speech Recognition angebunden werden kann.
- In dieser Stufe wird noch keine native Speech-Recognition-Funktion vollständig eingebaut, sondern die Freischaltung/Verbergung sauber vorbereitet.

### 5. Technische Details
- Bestehendes Muster wird genutzt:
  - `app_settings`
  - Admin-Update über bestehende RLS-geschützte Tabelle
  - Realtime-Subscription ähnlich `useLaunchMode`
- Neuer Hook möglich:
  - `useCallCaptionsFeature()`
  - liest `app_settings.key = 'call_captions'`
  - gibt `enabled`, `nativeOnly`, `translationEnabled`, `loading` zurück
- Datenbankänderung:
  - falls nötig: Policy erweitern, damit authentifizierte Nutzer genau diesen Feature-Key lesen dürfen.
  - Admins behalten volle Schreibrechte.

### 6. Validierung
- Typecheck ausführen.
- Prüfen:
  - deaktiviert: kein Untertitel-Button im Call
  - aktiviert: Untertitel-Button sichtbar
  - Nicht-Admin kann nicht umschalten
  - Admin-Schalter speichert korrekt

### Ergebnis
Danach ist die Call-Untertitel-Funktion sicher hinter einem Admin-Schalter versteckt. Nutzer sehen sie erst, wenn du sie im Admin aktivierst. Anschließend kann die native iOS/Android-Untertitel- und Übersetzungsfunktion kontrolliert ausgerollt werden.