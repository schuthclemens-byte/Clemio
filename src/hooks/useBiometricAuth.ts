import { useState, useEffect, useCallback } from "react";

const BIOMETRIC_ENABLED_KEY = "hearo_biometric_enabled";
const BIOMETRIC_CRED_KEY = "hearo_biometric_cred";

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

function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
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
  return bytes.buffer;
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveDeviceKey(): Promise<string> {
  const seed = `${window.location.origin}|${navigator.userAgent}|hearo-biometric-v2`;
  const digest = await crypto.subtle.digest("SHA-256", textToBytes(seed));
  return bytesToHex(new Uint8Array(digest));
}

function xorTransform(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

async function obfuscate(text: string): Promise<string> {
  const key = await deriveDeviceKey();
  return btoa(xorTransform(text, key));
}

async function deobfuscate(encoded: string): Promise<string> {
  const key = await deriveDeviceKey();
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
      const userIdSeed = await crypto.subtle.digest("SHA-256", textToBytes(phone.trim().toLowerCase()));
      const userId = new Uint8Array(userIdSeed);
      const challenge = generateChallenge();

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: "Hearo Messenger",
          },
          user: {
            id: userId,
            name: phone.trim(),
            displayName: `Hearo - ${phone.trim()}`,
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
        version: 2,
        credentialId: bufferToBase64Url(credential.rawId),
        phone: await obfuscate(phone.trim()),
        password: await obfuscate(password),
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

      const phone = await deobfuscate(data.phone);
      const password = await deobfuscate(data.password ?? data.token ?? "");
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

