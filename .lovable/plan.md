

# Admin-Zugang in den Einstellungen statt Navigation

## Was du willst
Der Admin-Link soll **in den Einstellungen** bleiben — nicht in der unteren Navigation. Von den Einstellungen aus navigierst du dann zum Admin-Bereich.

## Änderungen

### 1. BottomTabBar.tsx — Admin-Tab wieder entfernen
- Den bedingten Admin-Tab aus der `tabs`-Liste entfernen
- Navigation bleibt bei den 4 Standard-Tabs (Chats, Anrufe, Profil, Einstellungen)

### 2. SettingsPage.tsx — Admin-Link wiederherstellen
- `useAdminRole` importieren
- Wenn `isAdmin === true`, eine "Administration"-Sektion mit Shield-Icon und Link zu `/admin` anzeigen
- Platzierung: oben in den Einstellungen

### 3. AppSidebar.tsx — Admin-Link entfernen (falls hinzugefügt)
- Sidebar bleibt bei den 4 Standard-Einträgen

## Ergebnis
- Navigation: 4 Tabs wie vorher
- Einstellungen → "Administration" → `/admin`

