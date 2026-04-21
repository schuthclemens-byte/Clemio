

## Coming-Soon-Modus mit Admin-Schalter

Landingpage zeigt „Bald verfügbar" statt aktiver CTAs. Login bleibt direkt über `/login` erreichbar (für dich + Tester). Eingeloggte Nutzer merken nichts. Schalter wird im Admin-Dashboard ein/ausgeschaltet.

### Was der Nutzer sieht

**Coming-Soon AN (Default nach Aktivierung):**
- Hero-CTA „App ausprobieren" → wird zu Button **„Bald verfügbar"** (deaktiviert, leicht ausgegraut)
- Final-CTA-Button → genauso „Bald verfügbar"
- Direkter Aufruf von `/login` funktioniert weiter (dein Hintertür-Zugang)
- Eingeloggte Nutzer werden wie bisher direkt zu `/chats` weitergeleitet

**Coming-Soon AUS:**
- Alles wie heute, Buttons führen zu `/login`

### Steuerung

Im Admin-Dashboard (`/admin`) kommt eine neue **Karte „Launch-Modus"** mit:
- Großer Toggle-Schalter „Coming Soon aktiv"
- Status-Anzeige (grün „Live" / orange „Coming Soon")
- Letzte Änderung (Zeitstempel + Admin-Name)

Nur Admins sehen und bedienen das. Umschalten wirkt sofort für alle Besucher (ohne Re-Deploy).

### Technische Umsetzung

**1. Datenbank (Migration)**
- Neue Tabelle `app_settings` mit Spalten: `key text PK`, `value jsonb`, `updated_at`, `updated_by uuid`
- Initialer Eintrag: `{ key: 'launch_mode', value: { coming_soon: true } }`
- RLS:
  - SELECT: für alle (auch anonym) erlaubt — Landingpage muss den Wert lesen können
  - UPDATE/INSERT: nur für `has_role(auth.uid(), 'admin')`
- Realtime auf der Tabelle aktivieren, damit Toggle live wirkt

**2. Hook `useLaunchMode`**
- Liest `launch_mode` beim Mount
- Subscribt auf Realtime-Änderungen
- Gibt `{ comingSoon: boolean, loading: boolean }` zurück

**3. Frontend-Anpassungen**
- `HeroSectionV2.tsx`: CTA-Button nutzt `useLaunchMode`. Bei `comingSoon=true` → Text „Bald verfügbar", `disabled`, kein onClick, dezente Opacity
- `FinalCTASection.tsx`: gleiche Logik
- Neuer i18n-Key `landing.comingSoon` in allen 6 Sprachen (DE: „Bald verfügbar", EN: „Coming soon", etc.)
- `/login` bleibt **unverändert** erreichbar — keine Sperre dort

**4. Admin-UI (`AdminPage.tsx`)**
- Neue Sektion „Launch-Modus" oberhalb der Tabs
- Switch-Komponente (shadcn) gebunden an `launch_mode.coming_soon`
- Beim Toggle: UPDATE auf `app_settings` mit `updated_by = auth.uid()`
- Toast-Bestätigung „Modus aktualisiert"

### Was NICHT passiert
- Keine Änderung am Routing
- Keine Änderung an Auth/Registrierung-Logik (Backend bleibt offen, nur die Buttons verstecken sich)
- `/install`-Seite bleibt erreichbar (falls jemand die URL kennt) — sag Bescheid wenn die auch unter den Schalter soll
- Keine Datenmigration, keine Auswirkung auf bestehende Nutzer/Sessions

### Test-Plan nach Implementierung
1. Als Admin auf `/admin` → Toggle umlegen → Landingpage in zweitem Tab sofort aktualisiert (Realtime)
2. Hero- und Final-CTA zeigen „Bald verfügbar", sind nicht klickbar
3. `/login` direkt aufrufen → funktioniert weiterhin
4. Eingeloggter Test-Account (123456789) → wird auf `/chats` weitergeleitet, sieht nichts vom Coming-Soon-Modus
5. Toggle wieder aus → CTAs zurück zu „App ausprobieren"

