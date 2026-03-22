import { useState, useEffect, useCallback } from "react";

const BIOMETRIC_ENABLED_KEY = "hearo_biometric_enabled";
const BIOMETRIC_CRED_KEY = "hearo_biometric_cred";

interface StoredCredential {
  phone: string;
  token: string; // base64 encoded password
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

// Generate a random challenge
function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

// Convert ArrayBuffer to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Convert base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const available = await isPlatformAuthenticatorAvailable();
      setIsAvailable(available);
      setIsEnabled(localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true");
      setChecking(false);
    };
    check();
  }, []);

  // Register biometric credential after successful login
  const enableBiometric = useCallback(async (phone: string, password: string): Promise<boolean> => {
    try {
      const userId = new TextEncoder().encode(phone) as BufferSource;
      const challenge = generateChallenge();

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge as BufferSource,
          rp: { name: "Hearo Messenger", id: window.location.hostname },
          user: {
            id: userId,
            name: phone,
            displayName: `Hearo - ${phone}`,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256
            { alg: -257, type: "public-key" },  // RS256
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

      // Store credential ID and encrypted login data
      const storedCred: StoredCredential = {
        phone,
        token: btoa(password),
      };

      localStorage.setItem(BIOMETRIC_CRED_KEY, JSON.stringify({
        credentialId: bufferToBase64(credential.rawId),
        ...storedCred,
      }));
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      setIsEnabled(true);
      return true;
    } catch (err) {
      console.error("Biometric registration failed:", err);
      return false;
    }
  }, []);

  // Authenticate with biometric and return stored credentials
  const authenticateWithBiometric = useCallback(async (): Promise<{ phone: string; password: string } | null> => {
    try {
      const stored = localStorage.getItem(BIOMETRIC_CRED_KEY);
      if (!stored) return null;

      const { credentialId, phone, token } = JSON.parse(stored);
      const challenge = generateChallenge();

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge as BufferSource,
          allowCredentials: [{
            id: base64ToBuffer(credentialId),
            type: "public-key",
            transports: ["internal"],
          }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (!assertion) return null;

      return {
        phone,
        password: atob(token),
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
    return !!localStorage.getItem(BIOMETRIC_CRED_KEY);
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
