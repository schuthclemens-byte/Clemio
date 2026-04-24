# 📧 E-Mail-System für Clemio

## Was du bekommst

Alle Mails werden **kostenlos** über deine bestehende `notify.clemio.app` Infrastruktur versendet. Admin-Mails (Reports, Kontakt) gehen an **`clemensschuth@outlook.de`** als "Reply-To" — User antworten direkt in dein Outlook.

---

## 🎯 Teil 1 — Auth-Mails (Passwort-Reset & Signup)

Templates existieren bereits in `_shared/email-templates/` (`recovery.tsx`, `signup.tsx` usw.) — sie müssen nur aufs Clemio-Branding gestylt und der Reset-Flow im Frontend gebaut werden.

### Branding aller 6 Auth-Templates
- Clemio-Primary-Farbe (`hsl(263 70% 50%)`), Inter Font, runde Buttons (`16px` radius)
- Deutsche Texte ("Passwort zurücksetzen" statt "Reset password")
- Logo aus `public/` einbetten falls vorhanden, sonst Text-Logo "Clemio"

### Passwort-Reset Flow (User-Erfahrung)
1. **Login-Seite**: Neuer Link "Passwort vergessen?" unter dem Login-Button
2. **Forgot-Password-Sheet**: User gibt Telefonnummer ein → System verschickt Mail an `{normalized_phone}@phone.clemio.app`
3. **Reset-Mail**: User klickt Link → landet auf `/reset-password` (Seite existiert bereits)
4. **Neues Passwort setzen**: Mit `PasswordRequirements`-Komponente (8+ Zeichen, Groß/Klein/Zahl)
5. **Bestätigungs-Mail**: "Dein Passwort wurde geändert" → an User
6. **Auto-Login** + Redirect zu `/chats`

### Welcome-Mail nach Signup
- Wird automatisch via `auth-email-hook` versendet (existiert schon, nur Styling-Update)

---

## 🛡️ Teil 2 — Sicherheits-Mails (an User)

Drei neue Transactional-Templates + Trigger-Code:

| Template | Auslöser | Empfänger |
|---|---|---|
| `account-deleted` | `delete-account` Edge Function nach erfolgreicher Löschung | User (an die Mail kurz vor Löschung gespeichert) |
| `voice-clone-created` | Nach erfolgreichem Voice-Klon in `verify-and-clone-voice` | Voice-Owner |
| `password-changed` | Nach erfolgreichem Reset oder manuellem Wechsel | User |
| `premium-activated` | Nach erfolgreichem Stripe-Checkout in `check-subscription` | Subscriber |
| `premium-cancelled` | Nach Stornierung in `customer-portal` | Subscriber |

Alle deutsch, gebrandet, mit kurzen Erklärungen ("Was bedeutet das?") und Support-Kontakt.

---

## 🚨 Teil 3 — Report-Benachrichtigung an dich

Wenn ein User jemanden meldet (`reports` Tabelle bekommt INSERT):

1. **Datenbank-Trigger** auf `public.reports` → ruft Edge Function auf
2. **Mail an `clemensschuth@outlook.de`** mit:
   - Report-Typ (Nachricht/Voice/User)
   - Grund (Spam/Abuse/Wrong-Voice/Other)
   - Anonymisierte IDs des Reporters & Gemeldeten (DSGVO-konform — du nutzt das Admin-Dashboard für Details)
   - Direkt-Link zum Admin-Bereich `/admin?tab=reports`
3. **Spam-Schutz**: Nur 1 Mail pro 5 Minuten gleicher Reporter→Gemeldeter Kombination

---

## 💬 Teil 4 — Kontaktformular auf Landingpage

### Neue Sektion in der Landingpage
- Neuer Bereich `<ContactSection />` auf `/` zwischen `PrivacySection` und `CTASection`
- Titel: "Kontakt aufnehmen", kurzer Text "Fragen, Feedback oder Geschäftliches? Schreib uns."
- Apple-Style-Card mit Gradient passend zum Clemio-Look

### Formular-Felder (mit Kategorie wie gewünscht)
- **Name** (3-100 Zeichen)
- **E-Mail** (validiert)
- **Kategorie** (Dropdown): `Bug-Report` / `Feedback` / `Frage` / `Geschäftlich` / `Sonstiges`
- **Nachricht** (10-2000 Zeichen)
- **Honeypot-Feld** (versteckt, gegen Bots)
- Rate-Limit: max 3 Submissions pro IP/Stunde

### Was passiert nach dem Absenden
1. **An dich** (`clemensschuth@outlook.de`): Vollständige Mail mit allen Daten + Reply-To = User-Mail (du klickst "Antworten" und schreibst direkt zurück)
2. **An den User**: Bestätigung "Wir haben deine Nachricht erhalten" mit Kategorie-Bezug ("Wir antworten meistens innerhalb von 48 Std.")
3. **In Datenbank** (`contact_submissions`): Audit-Log für Spam-Analyse

---

## 🔧 Technische Details

### Backend
- **Email-Infrastructure-Setup** läuft (Domain `notify.clemio.app` aktiv)
- **Auth-Email-Hook**: Templates updaten → redeploy
- **Transaktionale Mails**: Setup über `scaffold_transactional_email`, dann 7 Templates registrieren:
  - `contact-form-admin`, `contact-form-confirmation`
  - `report-admin-alert`
  - `account-deleted`, `voice-clone-created`, `password-changed`
  - `premium-activated`, `premium-cancelled`
- Alle templates auf weißem Background (`#ffffff`) auch im Dark Mode (Mail-Client-Konvention)

### Frontend
- **Neue Komponenten**: `ForgotPasswordSheet.tsx`, `ContactSection.tsx`
- **i18n**: Alle neuen Strings in alle 6 Sprachen (`de`, `en`, `es`, `fr`, `tr`, `ar`)
- **Routing**: `/reset-password` existiert bereits — nur Logik anpassen
- **Login-Seite**: Link "Passwort vergessen?" hinzufügen

### Datenbank
- **Neue Tabelle** `contact_submissions` mit RLS:
  - INSERT: `anon` und `authenticated` (über Rate-Limit-RPC)
  - SELECT/UPDATE: nur Admins (`has_role('admin')`)
- **Neuer Trigger** auf `reports`: invoke Edge Function `notify-report` (mit `pg_net`)
- **RPC** `submit_contact_form` mit Zod-Server-Side-Validierung + Rate-Limit-Check

### Edge Functions
- `notify-report` (neu): Datenbank-Trigger → ruft `send-transactional-email` mit `report-admin-alert`
- `send-transactional-email` (von Scaffold erstellt) macht den Rest

### Sicherheit
- Server-side Validation mit Zod in allen Edge Functions
- Honeypot + Rate-Limiting auf Kontaktformular
- Idempotency-Keys für alle Mail-Sends (keine Duplikate bei Retries)
- Reply-To-Header auf Admin-Mails = User-Adresse → du antwortest direkt

---

## 💡 Zusätzliche sinnvolle Features (mein Vorschlag — sag bescheid ob ja/nein)

Diese habe ich NICHT in den Plan oben aufgenommen, würde sie aber empfehlen:

- **Neue Geräte-Anmeldung**: Mail "Neuer Login von Gerät X" — braucht aber Device-Tracking-Tabelle (Aufwand mittel)
- **Wöchentlicher Admin-Digest**: Jeden Montag eine Mail an dich mit Stats (neue User, Reports, Premium-Conversions) — nutzt deine Cron-Infrastruktur

Falls du die auch willst, sag's nach Approval — ich baue sie in einem Folgeschritt.

---

## ✅ Ergebnis

Nach Approval hast du:
- Voll funktionierenden Passwort-Reset mit Bestätigung
- Gebrandete Auth-Mails auf Deutsch
- Sicherheits-Mails für alle kritischen Aktionen (DSGVO-Plus)
- Sofortige Report-Alerts in dein Outlook + Admin-Dashboard
- Profi-Kontaktformular mit Spam-Schutz
- **Kosten: 0 €** — alles läuft über deine bestehende Lovable Cloud Infra

**Wenn du später `support@clemio.app` als echte Empfangs-Adresse willst**, sag mir Bescheid — ich erkläre dir dann das kostenlose Cloudflare-Email-Routing-Setup (~5 Minuten DNS-Änderung).
