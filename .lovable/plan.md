

# Admin-Zugang auf dem Handy sichtbar machen

## Problem
Es gibt **keinen Link** zum Admin-Bereich in der App-Navigation. Die Admin-Seite existiert nur unter der direkten URL `/admin`. Auf dem Handy gibt es keine Möglichkeit, dorthin zu navigieren, ohne die URL manuell einzugeben.

Zusätzlich: Der `useAdminRole`-Hook nutzt `as any` beim Query auf `user_roles`, was bei RLS-Problemen still fehlschlägt und `isAdmin = false` zurückgibt.

## Änderungen

### 1. Admin-Link in SettingsPage einbauen
- `useAdminRole` importieren
- Wenn `isAdmin === true`, einen Link-Row mit Shield-Icon zu `/admin` anzeigen
- Platzierung: ganz oben oder in einer eigenen Sektion "Administration"

### 2. useAdminRole robuster machen
- Fehlerbehandlung für den Fall, dass die Tabelle `user_roles` nicht existiert oder RLS den Zugriff blockiert
- Console-Log bei Fehlern, damit Probleme sichtbar werden

### 3. Optional: Admin-Link im BottomTabBar (nur für Admins)
- Nur anzeigen wenn `isAdmin === true`
- Shield-Icon als 5. Tab oder als Badge auf Settings

## Ergebnis
- Als Admin siehst du auf dem Handy in den Einstellungen einen Link zum Admin-Bereich
- Kein manuelles URL-Eintippen mehr nötig

