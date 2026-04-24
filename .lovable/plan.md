## Ist das sinnvoll?

Ja — aus zwei Gründen:

1. **UX-Klarheit**: Der Sender sieht aktuell keine eindeutige Erklärung, warum die andere Person nicht antwortet bzw. warum die Nachricht nur einen Haken hat. Ein klarer Hinweis direkt über dem Nachrichtenfeed verhindert Verwirrung ("Wurde meine Nachricht überhaupt zugestellt?").
2. **Konsistenz mit dem Message-Request-Flow**: Der Empfänger sieht die Anfrage in einem eigenen Bereich mit Accept/Decline. Der Sender braucht das Pendant — sonst wirkt der Flow einseitig.

Der Banner ist **bereits implementiert** in `ChatPage.tsx` (Zeilen 1160–1166), aber mit zwei Schwächen:
- Hartkodierte DE/EN-Strings via `locale === "de"` Ternary — die anderen 4 Sprachen (ES/FR/TR/AR) fallen auf Englisch zurück.
- Position ist okay (über der Nachrichtenliste, im scrollbaren Container), aber der Banner scrollt mit weg statt sticky zu bleiben.

## Plan

### 1. i18n-Keys in allen 6 Sprachdateien ergänzen
Neue Keys in `src/i18n/{de,en,es,fr,tr,ar}.ts` unter dem `chat.*` Namespace:
- `chat.pendingRequest.banner` — Haupttext ("Wartet auf Freigabe — diese Person muss deine Nachricht zuerst annehmen.")
- `chat.pendingRequest.short` — Kurzform für kleine Viewports falls nötig

### 2. Banner in ChatPage.tsx refactoren
- Inline-Ternary entfernen, `t("chat.pendingRequest.banner")` verwenden.
- Banner aus dem scrollbaren Messages-Container herausziehen und **direkt unter dem Header** als sticky/fixiertes Element platzieren, damit er beim Scrollen sichtbar bleibt.
- Icon (z. B. `Clock` aus lucide-react) ergänzen für visuelle Klarheit.

### 3. Translation-Test aktualisieren
Der bestehende Vitest i18n-Coverage-Test (siehe `mem://style/internationalization`) muss die neuen Keys in allen 6 Sprachen finden.

## Technische Details

**Datei: `src/pages/ChatPage.tsx`**
- Zeilen 1160–1166: Inline-Banner entfernen.
- Banner neu einfügen direkt nach dem ChatHeader-Element (außerhalb des messagesContainerRef-Divs), als `sticky top-[header-height]` oder einfach als statischer Block zwischen Header und Scroll-Container.

**Datei: `src/i18n/de.ts`** (Beispiel)
```ts
"chat.pendingRequest.banner": "Wartet auf Freigabe — diese Person muss deine Nachricht zuerst annehmen.",
```
Analog für `en.ts`, `es.ts`, `fr.ts`, `tr.ts`, `ar.ts`.

**Keine DB-Änderungen, keine RLS-Änderungen, keine neuen Komponenten.** Reines Frontend-Polish.

## Out of Scope
- Logik wann `isPendingRequest` true wird (bleibt unverändert, funktioniert bereits korrekt).
- Empfänger-seitige MessageRequests-UI (bereits in vorheriger Iteration umgesetzt).