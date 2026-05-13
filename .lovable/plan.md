## Ziel

Nach dem 3-tägigen Trial sollen Nutzer Premium über **Apple App Store** (iOS) und **Google Play** (Android) für 4,99 €/Monat abonnieren können. Server validiert jeden Kauf, schreibt `subscriptions.premium_status = 'premium'` und setzt `premium_current_period_end`. Stripe ist endgültig raus.

## Architekturüberblick

```text
App (Capacitor)              Edge Functions                Apple / Google
─────────────────            ──────────────                ──────────────
PaywallDialog
  └─ "Abonnieren"
       │
       ▼
@capgo/capacitor-purchases
  (kauft via Store-SDK)
       │
       │  receipt / purchaseToken
       ▼
verify-iap ─────────► Apple App Store Server API
                      Google Play Developer API
       │
       ▼
subscriptions.premium_status = 'premium'

Server-Webhook:
App Store Server Notifications V2 ──► iap-webhook ──► subscriptions update
Google Real-time Developer Notifications (Pub/Sub HTTP) ──► iap-webhook
```

## Voraussetzungen (vom User zu liefern)

- Apple Developer Account + App-ID + IAP-Produkt `clemio_premium_monthly` konfiguriert
- Google Play Console + IAP-Produkt mit gleicher ID
- Apple: **In-App Purchase Key** (.p8 + Key-ID + Issuer-ID) für App Store Server API
- Google: **Service-Account JSON** mit Zugriff auf Play Developer API
- Apple: Shared Secret + App Bundle ID
- Google: Pub/Sub-Topic für Real-time Developer Notifications

## Schritte

### 1. Capacitor-Plugin installieren
- `@capgo/capacitor-purchases` (oder RevenueCat-Wrapper falls bevorzugt) hinzufügen
- iOS und Android konfigurieren (Capabilities, Berechtigungen)

### 2. Datenbank-Migration
- `subscriptions`: Felder `iap_provider` (`apple`/`google`), `iap_product_id`, `iap_original_transaction_id` (Apple) / `iap_purchase_token` (Google), `iap_latest_receipt`
- Index auf `iap_original_transaction_id` und `iap_purchase_token` (unique pro Provider) zur Verhinderung von Mehrfach-Aktivierung
- RPC `apply_iap_subscription(_user_id, _provider, _product_id, _expires_at, _transaction_id)` (SECURITY DEFINER) — schreibt `premium_status = 'premium'` und Period-End

### 3. Edge Function `verify-iap`
- Auth-Check (JWT)
- Input: `{ provider, receipt, productId }`
- Apple-Pfad: ruft App Store Server API `/inApps/v1/transactions/{transactionId}` mit JWT-Bearer (signiert via .p8)
- Google-Pfad: ruft `androidpublisher.purchases.subscriptionsv2.get` mit Service-Account-Token
- Validiert Produkt-ID und Ablaufzeit; ruft `apply_iap_subscription` RPC auf
- Secrets: `APPLE_IAP_KEY_P8`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_BUNDLE_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_PACKAGE_NAME`

### 4. Edge Function `iap-webhook` (öffentlich, signaturgeschützt)
- Apple: Server Notifications V2 — JWS-Signatur mit Apple-Root-Cert verifizieren
- Google: Pub/Sub Push — `Authorization`-Bearer prüfen + Subscription-Status nachladen via Play API
- Bei `DID_RENEW`/`SUBSCRIPTION_RENEWED` → Period verlängern
- Bei `EXPIRED`/`CANCEL` → `premium_status = 'expired'` oder `canceled`
- Bei `REFUND` → sofort `expired`

### 5. Frontend-Anpassung
- `useIAP` Hook: kapselt Plugin-Aufruf, ruft danach `verify-iap`, dann `refreshSubscription`
- `PaywallDialog`: bei abgelaufenem Trial Button „Premium für 4,99 €/Monat" startet `useIAP.purchase()`
- iOS-Restore-Button („Käufe wiederherstellen") für App-Store-Pflicht

### 6. Trial-Ablauf-Cron (Bonus, klein)
- pg_cron-Job alle 6 h: setzt abgelaufene Trials auf `premium_status = 'expired'` (für Stats und Push)

### 7. Privacy-Policy + i18n aktualisieren
- Stripe-Erwähnungen in `PrivacyPolicyPage.tsx` und allen 6 i18n-Files durch „Apple App Store / Google Play" ersetzen

## Akzeptanzkriterien

- Kauf im Sandbox-Tester führt innerhalb 3 s zu `premium_status = 'premium'` in DB
- Doppel-Kauf oder geteiltes Receipt schlägt fehl (unique-Index)
- Cancel im Store löst Webhook → DB-Update aus, App-UI aktualisiert sich beim nächsten Refresh
- Kein Client kann `subscriptions` direkt schreiben (RLS bleibt no-update)
- Refund → Premium sofort entzogen
- Trial-Whitelist und Founding-User bleiben unangetastet

## Reihenfolge der Umsetzung

1. Migration + RPC (klein)
2. `verify-iap` Edge Function + Secrets (mittel)
3. Capacitor-Plugin + `useIAP` + UI (mittel)
4. `iap-webhook` Edge Function (groß — Crypto-Verifikation)
5. Privacy/i18n-Update (klein)
6. End-to-End-Test in Apple/Google Sandbox
