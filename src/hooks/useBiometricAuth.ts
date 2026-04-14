import { useState, useEffect, useCallback } from "react";

const BIOMETRIC_ENABLED_KEY = "clemix_biometric_enabled";
const BIOMETRIC_CRED_KEY = "clemix_biometric_cred";

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

// --- AES-GCM encryption helpers ---

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const seed = `${window.location.origin}|${navigator.userAgent}|clemix-biometric-v3`;
  const encoded = new TextEncoder().encode(seed);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoded.buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  // Pack: salt (16) + iv (12) + ciphertext
  const packed = new Uint8Array(salt.length + iv.length + new Uint8Array(ciphertext).length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return bufferToBase64Url(packed.buffer as ArrayBuffer);
}

async function decrypt(encoded: string): Promise<string> {
  const packed = new Uint8Array(base64UrlToBuffer(encoded));
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const key = await deriveKey(salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

// --- Legacy v2 XOR helpers (for migration only) ---

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function legacyDeriveDeviceKey(): Promise<string> {
  const seed = `${window.location.origin}|${navigator.userAgent}|clemix-biometric-v2`;
  const digest = await crypto.subtle.digest("SHA-256", textToBuffer(seed));
  return bytesToHex(new Uint8Array(digest));
}

function xorTransform(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

async function legacyDeobfuscate(encoded: string): Promise<string> {
  const key = await legacyDeriveDeviceKey();
  return xorTransform(atob(encoded), key);
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

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: "Clemix Messenger",
          },
          user: {
            id: userId.buffer as ArrayBuffer,
            name: phone.trim(),
            displayName: `Clemix - ${phone.trim()}`,
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
        },
      }) as PublicKeyCredential | null;

      if (!credential) return false;

      const data = {
        version: 3,
        credentialId: bufferToBase64Url(credential.rawId),
        phone: await encrypt(phone.trim()),
        password: await encrypt(password),
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
      const challenge = generateChallenge();
      const allowCredentialId = data?.credentialId ? base64UrlToBuffer(data.credentialId) : null;

      const assertion = await navigator.credentials.get({
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
        },
      });

      if (!assertion) return null;

      let phone: string;
      let password: string;

      if (data.version === 3) {
        // Current AES-GCM format
        phone = await decrypt(data.phone);
        password = await decrypt(data.password);
      } else {
        // Legacy v2 XOR — migrate to v3
        phone = await legacyDeobfuscate(data.phone);
        password = await legacyDeobfuscate(data.password ?? data.token ?? "");

        // Re-encrypt with AES-GCM and save
        const migrated = {
          version: 3,
          credentialId: data.credentialId,
          phone: await encrypt(phone),
          password: await encrypt(password),
          createdAt: data.createdAt || Date.now(),
        };
        localStorage.setItem(BIOMETRIC_CRED_KEY, JSON.stringify(migrated));
      }

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
