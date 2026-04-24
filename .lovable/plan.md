## Ziel

Wenn ein **fremder Nutzer** (mit dem du noch nie geschrieben hast) dir zum ersten Mal schreibt, soll der Chat **nicht sofort** in deiner normalen Liste auftauchen. Stattdessen landet er als **Nachrichtenanfrage** in einem geschützten Bereich – du kannst dann entscheiden:

- **Annehmen** → Chat wird normal freigegeben
- **Ablehnen** → Chat wird gelöscht, Person bekommt keine Nachricht darüber
- **Blockieren** → Chat gelöscht + Person dauerhaft blockiert
- **Melden** → Optional zusätzlich an Admins melden

Das schützt vor Spam, Belästigung und unerwünschtem Erstkontakt – ähnlich wie bei Instagram, Signal oder Telegram.

---

## Wie es sich anfühlen wird

### Für den Empfänger (du bekommst Nachricht von Fremden)
1. Push-Benachrichtigung erscheint **neutral**: „Neue Nachrichtenanfrage" (kein Inhalt, kein Name-Preview)
2. In der Chat-Liste oben erscheint ein neuer Bereich: **„Nachrichtenanfragen (1)"**
3. Tippst du drauf, siehst du Absender + erste Nachricht in einer Vorschau
4. Vier Buttons: **Annehmen** · **Ablehnen** · **Blockieren** · **Melden**
5. Erst nach „Annehmen" wandert der Chat in deine normale Liste, du kannst antworten

### Für den Absender (du schreibst einen Fremden zum ersten Mal an)
1. Du schreibst die Person an wie gewohnt
2. Hinweis im Chat: *„Diese Person muss deine Nachricht zuerst freigeben"*
3. Solange unangenommen: Du siehst nur **einen Haken** (gesendet), kein „Gelesen"
4. Wird abgelehnt/blockiert: Du erfährst es **nicht** (kein Stigma, Schutz vor Stalking)

### Wer gilt als „Fremder"?
Eine Person ist **kein Fremder** wenn:
- Du bereits in einem gemeinsamen 1:1-Chat warst (egal wer ihn gestartet hat), **oder**
- Ihr in einer gemeinsamen Gruppe seid, **oder**
- Du der Person bereits Voice-Consent gegeben hast (oder umgekehrt)

In allen anderen Fällen → Nachrichtenanfrage.

---

## Plan / Schritte

1. **Datenbank umstellen** – Bestehende `chat_invitations`-Logik nutzen, aber bei `create_direct_chat` Status auf `pending` statt `accepted` setzen, wenn keine bisherige Beziehung besteht.
2. **Sichtbarkeits-Regeln** – Chats mit `pending`-Einladung tauchen beim Empfänger nicht in der normalen Liste auf, nur im neuen Bereich „Nachrichtenanfragen".
3. **Neuer UI-Bereich** „Nachrichtenanfragen" oben in der Chat-Liste mit Vorschau der ersten Nachricht und vier Aktionen.
4. **Push-Privacy** – Push für Erstkontakt-Nachricht zeigt nur „Neue Nachrichtenanfrage", nie Name oder Inhalt.
5. **Sender-Hinweis** – Im Chat des Absenders ein dezenter Banner: „Wartet auf Freigabe".
6. **Komponente `PendingInvitations`** erweitern um die zwei zusätzlichen Aktionen (Blockieren, Melden) – aktuell hat sie nur Annehmen/Ablehnen.
7. **Mehrsprachigkeit** – Neue Texte in alle 6 Sprachen (DE, EN, ES, FR, TR, AR).

---

## Technische Details

### Datenbank-Änderungen
- **`create_direct_chat` RPC anpassen**: Beim Erstellen eines neuen 1:1-Chats prüfen, ob zwischen den beiden Nutzern bereits eine „Beziehung" besteht (gemeinsame Konversation, gemeinsame Gruppe, oder Voice-Consent). Wenn ja → Invitation `accepted`. Wenn nein → `pending`, Empfänger wird **nicht** als `conversation_member` hinzugefügt (erst nach Annehmen).
- **RLS bleibt bestehen**: `messages` SELECT prüft `is_conversation_member` – der Empfänger kann die Nachrichten erst lesen, nachdem er angenommen hat. Für die Vorschau in der Anfrage liefert eine neue SECURITY DEFINER Funktion `get_pending_request_preview(invitation_id)` nur die erste Nachricht zurück (Absender + Inhalt + Zeit).
- **Spam-Schutz auf RPC-Ebene**: Wie bei `request_voice_consent` ein Rate-Limit (z. B. max. 5 ausstehende Anfragen pro Sender pro Stunde, 20 pro Tag), inkl. Cooldown wenn Empfänger ablehnt.
- **Block-Aktion**: Fügt Eintrag in `blocked_users` ein + setzt Invitation auf `declined` + löscht (cascading) Konversation.

### Sichtbarkeit / Queries
- `ChatListPage` filtert Konversationen, bei denen für den aktuellen User eine `chat_invitations`-Zeile mit Status `pending` existiert, **raus**.
- Neuer Bereich „Nachrichtenanfragen" oben in der Liste lädt `chat_invitations` mit `status='pending'` UND `invited_user_id = auth.uid()` UND nicht aus Gruppen-Einladungen (nur 1:1-DM-Anfragen). Gruppen-Einladungen bleiben wie bisher.
- Für jede Anfrage wird via Edge-Function/RPC die erste Nachricht der Konversation als Preview geladen.

### UI-Komponenten
- `PendingInvitations.tsx` erweitern oder neue `MessageRequests.tsx` Komponente daneben:
  - Avatar + Name des Absenders
  - Erste Nachricht als 2-Zeilen-Vorschau
  - 4 Buttons in einer Reihe (Annehmen / Ablehnen / Blockieren / Melden)
  - „Melden" öffnet bestehenden `ReportDialog`
- Im Chat des Absenders: Banner-Komponente die prüft ob die Konversation noch `pending` ist, und entsprechend einen sanften Hinweis zeigt.

### Push-Notifications
- `notify_new_message` Trigger: Prüfen ob Empfänger noch nicht `conversation_member` ist (= Anfrage). Falls ja → Push-Body durch generischen Text „Neue Nachrichtenanfrage" ersetzen, unabhängig von der Preview-Einstellung.

### Migration für bestehende Chats
- Alle aktuell bestehenden 1:1-Chats bleiben unverändert akzeptiert (kein Bruch für aktive Nutzer).
- Nur **neue** 1:1-Chats nach Deployment durchlaufen die Anfrage-Logik.

### Edge Cases
- Wenn der Empfänger den Absender **bereits geblockt** hat → `create_direct_chat` wirft Fehler („request_not_allowed"), wie bei Voice-Consent.
- Wenn der Absender später Mitglied einer gemeinsamen Gruppe wird → Anfrage automatisch auf `accepted` upgraden? **Empfehlung: Nein**, manuelle Freigabe bleibt explizit (sonst Schlupfloch über Gruppen).
- Selbst-Chat oder bereits bestehender Chat → wie bisher direkt akzeptiert.

---

## Was bleibt gleich
- Gruppen-Einladungen funktionieren weiter wie heute (sind ohnehin bereits opt-in).
- Bestehende Chats sind nicht betroffen.
- `blocked_users`, `reports`, `voice_consents` Tabellen werden weiterverwendet, keine neuen Konzepte.

---

**Meine Einschätzung:** Sehr empfehlenswert. Es passt 1:1 zu Clemios Privatsphäre-DNA (wie Voice-Consent), nutzt großteils bestehende Infrastruktur (`chat_invitations`, `blocked_users`, `reports`) und bringt einen echten Mehrwert gegenüber WhatsApp.

Soll ich so umsetzen? Eine Sache zur Entscheidung: **Soll der Banner im Sender-Chat sichtbar sein** („Wartet auf Freigabe") oder **komplett unsichtbar** (Sender erfährt nie, ob die andere Person die Anfrage gesehen hat)? Ich würde zu **sichtbar** raten – ehrlicher und weniger frustrierend.