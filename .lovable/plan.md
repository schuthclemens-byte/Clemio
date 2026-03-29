
Das passiert, weil die Sicherheitsprüfung nicht nur „denselben Fehler nochmal“ meldet, sondern in Wellen arbeitet:

1. Nach jedem Fix werden oft die nächstkleineren Probleme sichtbar  
   Ein zu breiter Fehler verdeckt oft andere Findings. Sobald der behoben ist, meldet der Scan die nächste Ebene.

2. Es laufen mehrere Scanner mit unterschiedlichen Regeln  
   In deinem Projekt kommen gerade Warnungen aus zwei Quellen:
   - regelbasierte Backend-Prüfung
   - heuristische Code-/Architekturprüfung  
   Dadurch tauchen neue Hinweise auf, obwohl der letzte Fix korrekt war.

3. Ein Teil der Findings sind echte Architektur-Themen, keine kleinen SQL-Fixes  
   Genau das ist aktuell der Fall: Die verbleibenden Punkte brauchen Produkt-/Flow-Änderungen, nicht nur „noch eine Policy“.

Was ich gerade konkret gefunden habe:

- Profil-Warnung: teilweise Scanner-Rauschen, teilweise berechtigt
  - Eure Kontakt-Suche nutzt bereits sichere RPCs, die nur `id`, `display_name`, `avatar_url` zurückgeben.
  - Aber ich habe noch eine Stelle gefunden, die im Backend `display_name, phone_number` aus `profiles` liest (`supabase/functions/notify-incoming-call/index.ts`). Das ist zwar nur für den anrufenden Nutzer selbst, triggert aber genau diese Art Warnung.
  - Deshalb kommt das Thema immer wieder hoch, obwohl der Hauptteil schon sauber umgebaut wurde.

- Mitglieder-Bypass bei Chats: echter offener Security-Punkt
  - In `src/components/chat/NewChatDialog.tsx` wird der Zielnutzer direkt in `conversation_members` eingefügt.
  - Das bedeutet: Wer einen Chat erstellt, kann andere Nutzer ohne Zustimmung hinzufügen.
  - Das ist kein „Scan-Fehlalarm“, sondern ein echter Produktfluss, der geändert werden muss.

- Voice-Consent-Spam: echter offener Punkt
  - `voice_consents` erlaubt aktuell potenziell wiederholte Anfragen ohne harte Duplikat-Sperre/Cooldown.
  - Auch das ist eher Abuse-Prevention als klassischer RLS-Fix.

Mein Plan, damit dieser Loop aufhört:

1. Profil-Thema endgültig stabilisieren
   - Eine sichere Kontakt-View/Funktion einführen, die nur erlaubte Felder freigibt
   - Alle serverseitigen Profil-Lookups darauf umstellen
   - In der Incoming-Call-Funktion den Fallback auf `phone_number` entfernen
   - Danach die verbleibende Owner-only-Profilwarnung als „intentional + sicher über RPC gelöst“ dokumentieren/ignorieren

2. Chat-Einladungen statt Direkt-Hinzufügen bauen
   - Direkte Inserts fremder Nutzer in `conversation_members` entfernen
   - Einladung/Anfrage-Flow einführen
   - Erst nach Annahme wird die Mitgliedschaft erstellt
   - `NewChatDialog` und Gruppen-Erstellung entsprechend umbauen

3. Voice-Consent absichern
   - Unique-Schutz für `(voice_owner_id, granted_to_user_id)`
   - Serverseitige Anfrage-Funktion mit Duplicate-Check/Cooldown
   - Direkte Client-Inserts vermeiden

4. Danach einmal gezielt neu scannen
   - echte Findings löschen
   - heuristische False Positives sauber ignorieren
   - nicht nochmal blind „alles fixen“, sondern den Scan danach stabil halten

Kurz gesagt:  
Du hast nicht 4–5 mal denselben Fehler erfolglos repariert. Du hast schon mehrere breite Probleme geschlossen. Jetzt bleiben die übrig, die entweder
- architektonisch sind, oder
- vom Scanner ohne Kontext wieder gemeldet werden.

Wenn ich das jetzt sauber weiterplane, würde ich als Nächstes genau in dieser Reihenfolge arbeiten:
1) Profil-Warnung endgültig beruhigen  
2) Chat-Einladungs-Flow einführen  
3) Voice-Consent-Spam absichern
