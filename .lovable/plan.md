

# Clemio Redesign: Erheblich von WhatsApp abheben

## Ziel
Clemio soll sich durch ein komplett eigenständiges, modernes Design, Voice-First-Interaktion und sichtbare KI-Integration klar von WhatsApp unterscheiden.

## Phase 1: Visuelles Redesign

### 1.1 Chat-Bubbles neu gestalten
- Weg von den klassischen WhatsApp-Bubbles (runde Ecken mit Schwanz)
- Neue Form: **Glassmorphe Bubbles** mit Blur-Effekt, leichtem Gradient und sanftem Schatten
- Eigene Nachrichten: Gradient (Sunset-Farben), fremde: Frosted-Glass auf transparentem Hintergrund
- Subtile Eingangs-Animation (Scale + Fade statt nur Slide-Up)

### 1.2 Chat-Liste modernisieren
- Runde Avatare → **Quadratische Avatare mit abgerundeten Ecken** (wie Telegram/Signal-Stil aber eigenständig)
- Ungelesene Chats mit linkem Farbbalken (Gradient-Akzent) statt nur Badge-Zahl
- Swipe-Aktionen mit modernen Glassmorphe-Hintergründen
- Letzte Nachricht mit Typ-Icon (🎤 Mic-Icon bei Audio, 📷 bei Bild)

### 1.3 Navigation umgestalten
- Bottom-Tab-Bar: **Floating Pill-Design** statt flacher WhatsApp-Leiste
- Aktiver Tab mit Gradient-Pill-Hintergrund statt nur Farbwechsel
- Leicht schwebend mit Schatten, abgerundete Ecken, Glassmorphe

### 1.4 Farbschema & Typografie verfeinern
- Gradient-Akzente stärker einsetzen (Header, aktive Elemente)
- Micro-Animationen: Übergänge beim Seitenwechsel, Hover-Effekte
- Subtle Parallax-Effekte im Chat-Hintergrund

## Phase 2: Voice-First UX

### 2.1 Voice-Button prominent machen
- Großer, pulsierender Voice-Button im Chat-Input (nicht nur kleines Mic-Icon)
- Während Aufnahme: animierte Wellenform statt nur roter Punkt
- Voice-Status-Badge an Kontakten ("Hat Stimmprofil" als kleines Soundwave-Icon)

### 2.2 Inline-Vorlese-Indikator
- Wenn eine Nachricht vorgelesen wird: animierte Soundwave direkt in der Bubble sichtbar (bereits vorhanden, wird prominenter)
- "Tap to Listen"-Hinweis bei erstem Mal als Tooltip

### 2.3 Voice-Onboarding
- Beim ersten Chat-Öffnen: dezenter Hinweis "Clemio liest dir Nachrichten vor – tippe eine Nachricht an"

## Phase 3: KI-Integration sichtbar machen

### 3.1 Smart-Reply-Chips
- Unter der letzten empfangenen Nachricht: 2-3 KI-generierte Antwort-Vorschläge als klickbare Chips
- Lädt automatisch (nicht erst nach Klick auf Sparkles-Button)

### 3.2 KI-Button-Redesign
- Sparkles-Button (Clemio-KI) mit Gradient statt plain, leicht animiert (Shimmer-Effekt)
- Bei Antippen: Sheet fährt sanft von unten hoch mit Glassmorphe-Hintergrund

### 3.3 Übersetzungs-Indikator
- Automatische Spracherkennung bei fremdsprachigen Nachrichten
- Dezenter "Übersetzen"-Badge erscheint automatisch

## Technische Umsetzung

### Dateien die geändert werden:
1. **`src/index.css`** – Neue CSS-Variablen, Glassmorphe-Klassen, Floating-Tab-Styles, neue Animationen
2. **`src/components/chat/ChatBubble.tsx`** – Glassmorphe Bubbles, neue Animations-Klassen
3. **`src/components/chat/ChatListItem.tsx`** – Neues Layout mit Akzent-Balken, quadratische Avatare
4. **`src/components/BottomTabBar.tsx`** – Floating-Pill-Design
5. **`src/components/chat/ChatInput.tsx`** – Prominenter Voice-Button, Smart-Reply-Chips
6. **`src/pages/ChatPage.tsx`** – Smart-Reply-Integration, Voice-Hinweise
7. **`src/pages/ChatListPage.tsx`** – Neuer Header mit Gradient
8. **`tailwind.config.ts`** – Neue Animationen und Utilities

### Keine Datenbank-Änderungen nötig
Die Smart-Reply-Chips nutzen die bestehende `clemio-ki` Edge Function.

