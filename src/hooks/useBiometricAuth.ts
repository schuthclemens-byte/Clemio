import { useState, useEffect, useCallback } from "react";

const BIOMETRIC_ENABLED_KEY = "hearo_biometric_enabled";
const BIOMETRIC_CRED_KEY = "hearo_biometric_cred";

interface StoredCredential {
  phone: string;
  token: string;
}

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

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

// Simple XOR obfuscation (not encryption, but prevents plain-text storage)
function obfuscate(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function deobfuscate(encoded: string, key: string): string {
  const text = atob(encoded);
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

const OBF_KEY = "hearo-bio-2026";

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

  // Store credentials and register a WebAuthn credential for biometric gate
  const enableBiometric = useCallback(async (phone: string, password: string): Promise<boolean> => {
    try {
      const userId = new TextEncoder().encode(phone);
      const challenge = generateChallenge();

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge as BufferSource,
          rp: { name: "Hearo Messenger", id: window.location.hostname },
          user: {
            id: userId as BufferSource,
            name: phone,
            displayName: `Hearo - ${phone}`,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!credential) return false;

      // Store credential ID + obfuscated login data
      const data = {
        credentialId: bufferToBase64(credential.rawId),
        phone: obfuscate(phone, OBF_KEY),
        token: obfuscate(password, OBF_KEY),
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

  // Authenticate with biometric (WebAuthn assertion) then return stored credentials
  const authenticateWithBiometric = useCallback(async (): Promise<{ phone: string; password: string } | null> => {
    try {
      const stored = localStorage.getItem(BIOMETRIC_CRED_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      const challenge = generateChallenge();

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge as BufferSource,
          allowCredentials: [{
            id: base64ToBuffer(data.credentialId),
            type: "public-key",
            transports: ["internal"],
          }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (!assertion) return null;

      // Biometric verified - return stored credentials
      return {
        phone: deobfuscate(data.phone, OBF_KEY),
        password: deobfuscate(data.token, OBF_KEY),
      };
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
