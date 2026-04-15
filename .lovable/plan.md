

# TTS-Wiedergabe für eigene Nachrichten & Premium-Gate entfernen

## Übersicht
Zwei Bugs verhindern, dass du deine eigene geklonte Stimme hörst: (1) eigene Nachrichten werden explizit ausgeschlossen, (2) eine Premium-Prüfung blockiert die Wiedergabe.

## Änderungen

### 1. ChatPage.tsx — Eigene Stimme einschließen
- Zeile 1211: `!msg.isMine &&` entfernen, sodass `hasClonedVoice` auch für eigene Nachrichten gilt
- Voice-Profile-Laden muss auch die eigene User-ID abdecken (prüfen ob das bereits der Fall ist)

### 2. ChatBubble.tsx — Premium-Gate beim Abspielen entfernen
- Zeile 131-132: `requirePremium()` Wrapper entfernen
- Direkt `onPlayClonedVoice(...)` aufrufen wenn `hasClonedVoice` true ist
- Premium bleibt nur beim Voice-Cloning selbst (Stimme erstellen), nicht beim Anhören

### 3. Preload entfernen (Kosten-Optimierung)
- Prüfen ob automatische TTS-Preloads existieren und diese entfernen, damit ElevenLabs-Zeichen nur bei manuellem Klick verbraucht werden

## Ergebnis
- Eigene Nachrichten können in deiner geklonten Stimme angehört werden
- Keine Paywall beim Abspielen
- ElevenLabs-Zeichen werden nur bei Klick auf den Play-Button verbraucht

