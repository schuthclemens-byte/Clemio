import { useState, useEffect, useCallback } from "react";

const BIOMETRIC_ENABLED_KEY = "clemio_biometric_enabled";
const BIOMETRIC_CRED_KEY = "clemio_biometric_cred";

function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function generateChallenge(): ArrayBuffer {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge.buffer as ArrayBuffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

function textToBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

// --- PRF-based key derivation -------------------------------------------------
// The encryption key is derived from a WebAuthn PRF (pseudo-random function)
// extension result. The PRF secret is bound to the authenticator and only
// disclosed to the page after a successful user-verification gesture
// (Face ID / Touch ID / Windows Hello). XSS scripts therefore cannot derive
// the key without the user physically authenticating.

async function deriveKeyFromPrf(prfOutput: ArrayBuffer, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt.buffer as ArrayBuffer,
      info: new TextEncoder().encode("clemio-biometric-prf-v4"),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptWithPrf(plaintext: string, prfOutput: ArrayBuffer): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPrf(prfOutput, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const packed = new Uint8Array(salt.length + iv.length + new Uint8Array(ciphertext).length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return bufferToBase64Url(packed.buffer as ArrayBuffer);
}

async function decryptWithPrf(encoded: string, prfOutput: ArrayBuffer): Promise<string> {
  const packed = new Uint8Array(base64UrlToBuffer(encoded));
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const key = await deriveKeyFromPrf(prfOutput, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// Stable PRF input — same value every time so the same secret is produced.
const PRF_INPUT = new TextEncoder().encode("clemio-biometric-prf-input-v1").buffer as ArrayBuffer;

function extractPrfOutput(credential: PublicKeyCredential | null): ArrayBuffer | null {
  if (!credential) return null;
  // deno-lint-ignore no-explicit-any
  const ext: any = credential.getClientExtensionResults?.();
  const first = ext?.prf?.results?.first;
  if (first instanceof ArrayBuffer) return first;
  if (ArrayBuffer.isView(first)) return (first as Uint8Array).buffer.slice(0) as ArrayBuffer;
  return null;
}

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const available = await isPlatformAuthenticatorAvailable();
      setIsAvailable(available);
      const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
      const hasCred = !!localStorage.getItem(BIOMETRIC_CRED_KEY);
      setIsEnabled(enabled && hasCred);
      setChecking(false);
    };
    check();
  }, []);

  const enableBiometric = useCallback(async (phone: string, password: string): Promise<boolean> => {
    try {
      const userIdSeed = await crypto.subtle.digest("SHA-256", textToBuffer(phone.trim().toLowerCase()));
      const userId = new Uint8Array(userIdSeed as ArrayBuffer);
      const challenge = generateChallenge();

      // Step 1: Create the credential, requesting PRF support.
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Clemio Messenger" },
          user: {
            id: userId.buffer as ArrayBuffer,
            name: phone.trim(),
            displayName: `Clemio - ${phone.trim()}`,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "required",
          },
          attestation: "none",
          timeout: 60000,
          extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return false;

      // Step 2: Immediately call get() to actually retrieve the PRF output —
      // most authenticators only return PRF results on assertion, not creation.
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: generateChallenge(),
          allowCredentials: [
            {
              id: credential.rawId,
              type: "public-key",
              transports: ["internal", "hybrid"],
            },
          ],
          userVerification: "required",
          timeout: 60000,
          extensions: {
            prf: { eval: { first: PRF_INPUT } },
          } as AuthenticationExtensionsClientInputs,
        },
      })) as PublicKeyCredential | null;

      const prf = extractPrfOutput(assertion);
      if (!prf) {
        // Authenticator does not support PRF — refuse to enable biometric login
        // rather than fall back to a key derivable from public browser data.
        console.warn("Biometric: authenticator does not support PRF extension; refusing to store credentials.");
        return false;
      }

      const data = {
        version: 4,
        credentialId: bufferToBase64Url(credential.rawId),
        phone: await encryptWithPrf(phone.trim(), prf),
        password: await encryptWithPrf(password, prf),
        createdAt: Date.now(),
      };

      localStorage.setItem(BIOMETRIC_CRED_KEY, JSON.stringify(data));
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      setIsEnabled(true);
      return true;
    } catch (err) {
      console.error("Biometric registration failed:", err);
      return false;
    }
  }, []);

  const authenticateWithBiometric = useCallback(async (): Promise<{ phone: string; password: string } | null> => {
    try {
      const stored = localStorage.getItem(BIOMETRIC_CRED_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);

      // Older versions used a key derived from public browser properties — they
      // are no longer considered safe. Clear them and force re-enrollment.
      if (data.version !== 4) {
        localStorage.removeItem(BIOMETRIC_CRED_KEY);
        localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
        return null;
      }

      const challenge = generateChallenge();
      const allowCredentialId = data?.credentialId ? base64UrlToBuffer(data.credentialId) : null;

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          ...(allowCredentialId
            ? {
                allowCredentials: [
                  {
                    id: allowCredentialId,
                    type: "public-key",
                    transports: ["internal", "hybrid"],
                  },
                ],
              }
            : {}),
          userVerification: "required",
          timeout: 60000,
          extensions: {
            prf: { eval: { first: PRF_INPUT } },
          } as AuthenticationExtensionsClientInputs,
        },
      })) as PublicKeyCredential | null;

      const prf = extractPrfOutput(assertion);
      if (!prf) return null;

      const phone = await decryptWithPrf(data.phone, prf);
      const password = await decryptWithPrf(data.password, prf);

      if (!phone || !password) return null;
      return { phone, password };
    } catch (err) {
      console.error("Biometric authentication failed:", err);
      return null;
    }
  }, []);

  const disableBiometric = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    localStorage.removeItem(BIOMETRIC_CRED_KEY);
    setIsEnabled(false);
  }, []);

  const hasStoredCredential = useCallback(() => {
    return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true" && !!localStorage.getItem(BIOMETRIC_CRED_KEY);
  }, []);

  return {
    isAvailable,
    isEnabled,
    checking,
    enableBiometric,
    authenticateWithBiometric,
    disableBiometric,
    hasStoredCredential,
  };
}
