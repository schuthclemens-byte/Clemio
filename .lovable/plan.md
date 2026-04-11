

# KI-Vorschläge ins Eingabefeld einfügen statt direkt senden

## Kosten-Info
Die Clemio-KI nutzt das Lovable AI Gateway. Dein Workspace hat ein monatliches AI-Guthaben ($1 kostenlos). Jede KI-Anfrage verbraucht einen kleinen Betrag davon. Solange du im Rahmen dieses Guthabens bleibst, entstehen keine zusätzlichen Kosten.

## Problem
Aktuell ruft `onUseSuggestion` in `ChatPage.tsx` direkt `handleSend(text)` auf — die KI-Antwort wird also sofort als Nachricht gesendet, ohne dass der Nutzer sie vorher bearbeiten kann.

## Lösung

### Änderung 1: ChatInput um `externalText`-Prop erweitern
- Neues Prop `externalText?: string` an `ChatInput` hinzufügen
- Per `useEffect` den internen `text`-State setzen, wenn `externalText` sich ändert
- So wird der KI-Vorschlag ins Textfeld eingefügt und der Nutzer kann ihn bearbeiten

### Änderung 2: ChatPage — KI-Vorschlag ins Feld leiten statt senden
- Neuer State `pendingSuggestion` in `ChatPage`
- `onUseSuggestion` setzt `pendingSuggestion` statt `handleSend` aufzurufen
- `pendingSuggestion` wird als `externalText` an `ChatInput` übergeben
- Nach dem Setzen wird `pendingSuggestion` zurückgesetzt

### Betroffene Dateien
1. `src/components/chat/ChatInput.tsx` — neues `externalText`-Prop + useEffect
2. `src/pages/ChatPage.tsx` — `pendingSuggestion`-State, `onUseSuggestion`-Logik ändern

