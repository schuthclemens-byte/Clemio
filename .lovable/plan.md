

## Problem-Analyse

Ich habe alle Dateien überprüft:
- **Alle 4 Sprachdateien** (fr.ts, tr.ts, es.ts, ar.ts) haben die vollständigen Landing-Übersetzungen — korrekt und ohne Duplikate
- **Alle Landing-Komponenten** nutzen `useI18n()` korrekt
- **I18nContext** lädt Sprachen korrekt nach
- **LanguageSwitcher** ist korrekt implementiert mit z-[9999]
- **Keine Build-Fehler** in der Konsole

### Wahrscheinliche Ursache
Das Problem ist höchstwahrscheinlich ein **Cache/State-Problem**:
1. `localStorage` hat noch `app-locale: "de"` gespeichert von einer früheren Session
2. Der Preview-Browser hat alte gecachte JavaScript-Chunks

### Lösung

1. **Harten Reload erzwingen**: Lade die Preview-Seite komplett neu (Strg+Shift+R oder den Preview-Refresh-Button)
2. **localStorage leeren**: Falls es immer noch auf Deutsch bleibt, `localStorage` im Browser löschen

Falls das Problem nach einem harten Reload weiterhin besteht, kann ich eine Debug-Ausgabe einbauen, die zeigt welche Sprache erkannt wird und ob die Übersetzungsdateien korrekt geladen werden.

### Kein Code-Change nötig
Die Übersetzungen sind alle korrekt in den Dateien. Es handelt sich um ein Cache-Problem, nicht um einen Code-Fehler.

