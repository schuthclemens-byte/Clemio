## Ziel

1. Schluss mit „die ersten 50 bekommen 60 Tage Founding". Jeder neue Nutzer bekommt **7 Tage Premium-Trial**, dann automatisch Downgrade auf **Free** (mit harten Limits) — bis der Nutzer im Stripe-Checkout aktiviert. Bestehende Founding User behalten ihren Status.
2. Free- und Premium-Pläne mit **konkreten Zahlen-Limits** ausstatten (Voice anhören, KI-Verbesserungen, Übersetzungen, STT-/TTS-Minuten, Speicher, Stimme).
3. Alle Limits **serverseitig** in den Edge Functions prüfen + Monatszähler in DB.
4. **Admin-Bereich** „Plan & Kosten" mit Übersicht, Power-User-Warnungen und Pro-Nutzer-Verbrauch.

Apple/Google Server Notifications werden **vorbereitet** (Spalten + Edge-Function-Stub), aber noch nicht angebunden — darauf weisen wir im Admin-Dashboard hin.

---

## 1. Datenbank-Änderungen

### 1.1 Neue Tabelle `usage_limits` (1 Zeile pro Plan)

```text
plan (PK)        : 'free' | 'premium' | 'trial'
voice_listen     : int   -- pro Monat
ki_improve       : int
translate        : int
stt_minutes      : int
tts_minutes      : int
storage_mb       : int
voice_retrain    : int
active_voice     : int   -- 0/1
```

Seed mit den vom Nutzer genannten Zahlen (Free: 10/5/5/10/5/50/0/0, Premium & Trial gleich: 300/100/100/120/180/1024/2/1).

### 1.2 Neue Tabelle `usage_counters`

```text
user_id, period_start (1. des Monats), updated_at,
voice_listen, ki_improve, translate,
stt_seconds, tts_seconds, storage_bytes, voice_retrain
PK (user_id, period_start)
```

Index auf `(user_id, period_start desc)`. RLS: Nutzer liest nur eigene Zeile; nur `service_role` schreibt. Reset passiert „lazy" — Edge Functions arbeiten mit `period_start = date_trunc('month', now())` und legen Zeile bei Bedarf an.

### 1.3 `subscriptions` erweitern

Neue nullable Spalten (kein Schemabruch für Founding User):
- `subscription_provider text` — `'stripe' | 'apple' | 'google' | null`
- `subscription_status text` — `'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | null`
- `current_period_end timestamptz`
- `cancel_at_period_end boolean default false`
- `trial_used boolean default false`
- `last_payment_failed_at timestamptz`

### 1.4 `handle_new_subscription` umbauen

- Whitelist-Logik bleibt (sofort `founding`, Premium bis 2099).
- Founding-Counter `< 50` **entfernen**.
- Alle anderen: `plan = 'trial'`, `trial_start = now()`, `trial_end = now() + 7 days`, `premium_until = now() + 7 days`, `subscription_status = 'trialing'`, `trial_used = true`.

Bestehende Datensätze werden **nicht** angefasst (Founding User behalten 60 Tage / 2099).

### 1.5 RPCs (alle SECURITY DEFINER, Admin-only wo nötig)

- `get_user_usage_summary(_user_id uuid)` → JSON mit aktuellen Zählern + Limits + Plan. Aufrufbar vom Nutzer für sich selbst und von Admins für jeden.
- `check_and_consume_quota(_user_id uuid, _metric text, _amount int)` → bumpt Counter atomar, RAISE bei Limit. Wird ausschließlich aus Edge Functions mit Service Role aufgerufen, damit Frontend nicht tricksen kann.
- `admin_plan_overview()` → Aggregate (Free/Premium/Trial-Anzahl, aktive/gekündigte/abgelaufene Abos, payment_failed-Count, MRR grob = `count(stripe-active) * 4.99`, geschätzte Kosten pro Nutzer = einfache Formel aus Verbrauch × Tarifkonstanten).
- `admin_list_user_usage(_search, _plan, _over_limit_only, _limit, _offset)` → paginierte Liste mit Plan, Verbrauch %, Status, `current_period_end`, `cancel_at_period_end`.

### 1.6 Trigger

- Nach `subscriptions` UPDATE (`subscription_status` → `cancelled` / `expired` / `past_due`): Eintrag in `user_activity_log` (nutzt bestehendes System).
- Beim Anlegen einer Datei in Storage-Bucket `chat-media`/`stimmen` über bestehende Edge Functions: `usage_counters.storage_bytes` mitführen (in den Funktionen, nicht als DB-Trigger — Storage-Trigger sind unzuverlässig).

---

## 2. Edge Functions

### 2.1 Bestehende Funktionen mit Quota-Check ergänzen

In jeder dieser Funktionen direkt nach Auth-Check `check_and_consume_quota` aufrufen. Bei Limit → `429` mit `{ error: 'quota_exceeded', metric, limit }`:

| Funktion | Metric | Amount |
|---|---|---|
| `clemio-ki` (Verbessern) | `ki_improve` | 1 (alte Tageslimit-Logik raus) |
| `translate` | `translate` | 1 |
| `transcribe` | `stt_seconds` | gemessene Audiolänge |
| `voice-tts` & `voice-tts-stream` | `tts_seconds` | Output-Länge (bei Stream nach Abschluss) |
| `voice-clone` | `voice_retrain` | 1; zusätzlich Check auf `active_voice` |
| Voice-Anhören (neu: kleiner Endpoint `consume-voice-listen` oder über `voice-tts`-Path) | `voice_listen` | 1 pro abgespielter empfangener Voice-Nachricht |

### 2.2 Neue Funktion `admin-usage-overview` (verify_jwt = true)

Wrappt die zwei Admin-RPCs. Frontend ruft via `supabase.functions.invoke`.

### 2.3 `create-checkout` anpassen

`subscription_data: { trial_period_days: 7 }` ergänzen, damit Stripe selbst den Trial verwaltet sobald der Nutzer Karte hinterlegt. (Im App-Trial ohne Karte zählt unser DB-Trial; sobald der Nutzer in Stripe geht, übernimmt Stripe.)

### 2.4 Stub `apple-google-webhook` (verify_jwt = false)

Leere Hülle, die nur Payload loggt + `app_error_reports`-Eintrag mit Severity `warning`. Klare TODO-Kommentare zur späteren Anbindung. So kann der Nutzer die URL bereits in App Store Connect / Play Console hinterlegen.

---

## 3. Frontend

### 3.1 `useSubscription`

- Neuer Helfer `usageSummary` (lädt `get_user_usage_summary`), wird in `usePremiumGate` und in den Komponenten benutzt.
- `planLabel` zeigt „Testphase – noch X Tage" bei Trial.

### 3.2 PaywallDialog & Limit-Toasts

- Wenn Edge Function `429 quota_exceeded` liefert → Toast „Limit erreicht (X von Y)" + Button „Premium freischalten".
- In der Voice-Player-Komponente vor dem Play den Counter checken (UX), aber **immer** auf den Server-Fehler reagieren.

### 3.3 Settings → Abo

- Zeigt Trial-Restzeit, „Premium ab Tag 8: 4,99 €/Monat", Button „Jetzt aktivieren" (nutzt vorhandenes `startCheckout` mit `trial_period_days`).
- Nach Trial-Ende ohne Stripe → Hinweis „Du nutzt jetzt den Free-Plan" + Limit-Tabelle.

### 3.4 Admin-Bereich — neuer Tab „Plan & Kosten"

Neuer Eintrag in der Sidebar von `AdminPage.tsx` (Icon `BadgeEuro`, neben Aktivitäten). Komponente `AdminPlanCosts.tsx`:

**Block A — KPIs (Karten):**
Gesamt-Nutzer · Free · Trial · Premium · aktive Abos · gekündigt · abgelaufen · payment_failed · MRR (€) · Ø-Kosten/Nutzer · Gesamtkosten/Monat · Deckungsbeitrag pro Premium.

**Block B — Warnungen:**
- 🟡 Nutzer ≥ 80 % eines Limits
- 🔴 Nutzer ≥ 100 % eines Limits
- ⚡ Power-User (Top 10 nach geschätzten KI/Voice-Kosten)
- ⚠ Abo abgelaufen, aber Premium noch aktiv (Inkonsistenz)
- ⚠ Apple/Google-Status weicht vom Backend ab (sobald Webhook aktiv)

**Block C — Nutzerliste:**
Suche, Filter (Plan, „nur über Limit"), Pagination. Pro Zeile (aufklappbar):
- Plan-Badge, Status, `current_period_end`, `cancel_at_period_end`, `trial_used`/`trial_ends_at`
- Provider (Stripe/Apple/Google)
- Verbrauchs-Bars: Voice anhören, KI, Übersetzen, STT-Min, TTS-Min, Speicher, Voice-Retrain (jeweils X / Limit)

**Wichtig (Privacy):** Keine Nachrichteninhalte oder Audio-Inhalte im Admin sichtbar — nur Metadaten/Counter. Bestehende RLS bleibt unangetastet.

---

## 4. Bestehende Founding User

Bleiben unverändert. Im neuen Admin-Dashboard werden sie als „Founding (Premium bis 2099)" dargestellt und in MRR mit 0 € gewertet.

---

## 5. Was später dazukommt (außerhalb dieses Schritts)

- Tatsächliche Verarbeitung der Apple App Store Server Notifications V2 und Google RTDN — heute nur Stub + DB-Spalten vorbereitet.
- Monatlicher Cron-Job zum „Hard-Reset" alter Counter-Zeilen (heute lazy reicht, weil wir per `period_start` filtern).

---

## Sichtbar für dich

- Bei der Anmeldung neuer Nutzer: 7 Tage Premium → danach Free mit klaren Limits, Paywall springt automatisch an wenn ein Limit überschritten wird.
- In den Settings: Trial-Restzeit + 1-Klick „Premium aktivieren" (4,99 €/Monat, von Stripe verwaltet).
- Im Admin: neuer Tab **„Plan & Kosten"** mit allen oben genannten KPIs, Warnungen und Pro-Nutzer-Verbrauch.
- Founding User (du, Sabine etc.) bleiben unverändert.
