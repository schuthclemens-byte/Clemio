

## Schritt 7: Push-Benachrichtigungen vereinfachen

### Ziel
Push in den Einstellungen auf einen simplen Toggle reduzieren – kein technischer Jargon, kein separater Aktivieren-Button. Nur: An/Aus + kurzer Hinweis.

### Änderungen

**1. `src/pages/SettingsPage.tsx` – Push-Bereich vereinfachen (Zeilen 268-291)**
- Den gesamten Push-Block (Card mit Button/Dot) durch eine einfache `ToggleRow` ersetzen
- Toggle AN = Push aktiv (ruft `subscribe()` auf wenn nötig)
- Toggle AUS = zeigt Info-Toast dass Push in Browser-Einstellungen deaktiviert werden muss
- Einzeiliger Beschreibungstext: "Erhalte Benachrichtigungen bei neuen Nachrichten"
- Kein Status-Text "Aktiv/Inaktiv", kein separater Aktivieren-Button

**2. `src/components/PushPromptSheet.tsx` – Texte vereinfachen**
- "Nicht unterstützt"-State: Kürzerer Text ohne technische Details (Service Worker, Push API etc.)
- "Aktivieren"-State: Einfacher Satz statt Erklärung
- "Abgelehnt"-State: Kurzer Hinweis auf Browser-Einstellungen, keine technischen Begriffe

**3. `src/hooks/usePushCapability.ts` – Reason-Texte vereinfachen**
- Statt "Service Worker wird von diesem Browser nicht unterstützt" → "Dein Browser unterstützt keine Benachrichtigungen"
- Statt "Push API wird nicht unterstützt" → gleicher einfacher Text
- iOS-Text: "Füge die App zum Home-Bildschirm hinzu, um Benachrichtigungen zu erhalten"

### Ergebnis
- Settings: Ein Toggle "Benachrichtigungen" mit Bell-Icon – fertig
- PushPromptSheet: Klare, kurze Texte ohne Fachbegriffe
- Capability-Reasons: Nutzerfreundliche Sprache

