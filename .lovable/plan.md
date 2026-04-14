

## Plan: Sicherheitslücken automatisch beheben

Zwei Findings aus dem Security-Scan werden behoben:

---

### Fix 1: Voice-TTS Scope-Check (Mittel)

**Problem:** Jeder authentifizierte User kann mit beliebiger `senderId` die Stimme eines fremden Users nutzen – ohne Prüfung, ob sie in einem gemeinsamen Chat sind.

**Lösung:** In `supabase/functions/voice-tts/index.ts` vor dem TTS-Aufruf prüfen, ob der anfragende User und der `senderId` mindestens eine gemeinsame Conversation haben:

```typescript
// Prüfe ob User und Sender in einer gemeinsamen Conversation sind
const { data: userConvs } = await adminClient
  .from("conversation_members")
  .select("conversation_id")
  .eq("user_id", user.id);

const convIds = userConvs?.map(r => r.conversation_id) ?? [];

if (convIds.length === 0) {
  return 403 Forbidden;
}

const { count } = await adminClient
  .from("conversation_members")
  .select("id", { count: "exact", head: true })
  .eq("user_id", senderId)
  .in("conversation_id", convIds);

if (!count) {
  return 403 Forbidden;
}
```

---

### Fix 2: Biometric-Credentials sicher verschlüsseln (Schwer)

**Problem:** Passwort wird mit vorhersagbarem XOR in localStorage gespeichert. Jedes Script mit localStorage-Zugriff kann es entschlüsseln.

**Lösung:** XOR-Obfuscation durch **AES-GCM via WebCrypto** ersetzen. Der Schlüssel wird aus einem zufälligen Salt + festem Seed per PBKDF2 abgeleitet. Der Salt wird zusammen mit dem Ciphertext gespeichert. Das macht Brute-Force deutlich schwieriger, da der Salt pro Gerät einzigartig ist.

Änderungen in `src/hooks/useBiometricAuth.ts`:
- `obfuscate()` → `encrypt()` mit AES-GCM (WebCrypto)
- `deobfuscate()` → `decrypt()` mit AES-GCM
- Zufälliger 16-Byte-Salt + 12-Byte-IV pro Verschlüsselung
- PBKDF2 Key-Derivation statt direktem SHA-256
- Bestehende v2-Credentials werden beim nächsten Login automatisch migriert (Fallback auf alte Methode, dann neu verschlüsseln als v3)

---

### Dateien

| Datei | Änderung |
|---|---|
| `supabase/functions/voice-tts/index.ts` | Conversation-Membership-Check hinzufügen |
| `src/hooks/useBiometricAuth.ts` | XOR → AES-GCM Verschlüsselung |

