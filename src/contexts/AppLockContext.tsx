import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const SETTINGS_KEY = "clemio_applock_settings_v1";
const CRED_KEY = "clemio_applock_credential_id_v1";
const PIN_KEY = "clemio_applock_pin_v1";
const LAST_ACTIVE_KEY = "clemio_applock_last_active_v1";

export type AppLockMethod = "biometric" | "pin";
export type AppLockTimeout = 0 | 60 | 300 | 900; // seconds

export interface AppLockSettings {
  enabled: boolean;
  methods: AppLockMethod[]; // enabled methods
  timeoutSec: AppLockTimeout;
}

const DEFAULT_SETTINGS: AppLockSettings = { enabled: false, methods: [], timeoutSec: 0 };

// ---------- helpers ----------
function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlToBuf(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}
async function isBiometricAvailable(): Promise<boolean> {
  try {
    return (
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

// PIN hashing (PBKDF2 + salt)
async function hashPin(pin: string, saltB64u?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltB64u ? new Uint8Array(b64urlToBuf(saltB64u)) : randomBytes(16);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 210000, hash: "SHA-256" },
    baseKey,
    256,
  );
  return { hash: bufToB64url(bits), salt: bufToB64url(salt.buffer as ArrayBuffer) };
}

interface AppLockContextValue {
  settings: AppLockSettings;
  isLocked: boolean;
  biometricAvailable: boolean;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  setPin: (pin: string) => Promise<boolean>;
  removePin: () => void;
  setTimeout: (sec: AppLockTimeout) => void;
  unlockWithBiometric: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockNow: () => void;
  disableAll: () => void;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

function loadSettings(): AppLockSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function saveSettings(s: AppLockSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export const AppLockProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppLockSettings>(() => loadSettings());
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const s = loadSettings();
    return s.enabled && s.methods.length > 0;
  });
  const hasUnlockedThisSession = useRef(false);

  // Check biometric availability
  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  // Sync with storage
  const updateSettings = useCallback((updater: (s: AppLockSettings) => AppLockSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveSettings(next);
      return next;
    });
  }, []);

  // If lock disabled or no methods -> not locked
  useEffect(() => {
    if (!settings.enabled || settings.methods.length === 0) {
      setIsLocked(false);
    }
  }, [settings.enabled, settings.methods.length]);

  // Lock when not authenticated makes no sense — only lock when user is logged in
  useEffect(() => {
    if (!user) setIsLocked(false);
  }, [user]);

  // Visibility-based auto-lock
  useEffect(() => {
    if (!settings.enabled || settings.methods.length === 0) return;

    const handleHidden = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    };
    const handleVisible = () => {
      const lastStr = localStorage.getItem(LAST_ACTIVE_KEY);
      if (!lastStr) {
        setIsLocked(true);
        return;
      }
      const elapsed = (Date.now() - Number(lastStr)) / 1000;
      if (elapsed >= settings.timeoutSec) {
        setIsLocked(true);
      }
    };
    const onVis = () => (document.hidden ? handleHidden() : handleVisible());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", handleHidden);
    window.addEventListener("pageshow", handleVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", handleHidden);
      window.removeEventListener("pageshow", handleVisible);
    };
  }, [settings.enabled, settings.methods, settings.timeoutSec]);

  // Enable biometric: register a WebAuthn credential
  const enableBiometric = useCallback(async (): Promise<boolean> => {
    try {
      if (!(await isBiometricAvailable())) return false;
      const challenge = randomBytes(32);
      const userId = randomBytes(16);
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: challenge.buffer as ArrayBuffer,
          rp: { name: "Clemio App-Lock" },
          user: {
            id: userId.buffer as ArrayBuffer,
            name: "clemio-app-lock",
            displayName: "Clemio",
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
          attestation: "none",
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) return false;
      localStorage.setItem(CRED_KEY, bufToB64url(cred.rawId));
      updateSettings((s) => ({
        ...s,
        enabled: true,
        methods: Array.from(new Set([...s.methods, "biometric" as AppLockMethod])),
      }));
      return true;
    } catch (err) {
      console.error("App-Lock biometric enroll failed:", err);
      return false;
    }
  }, [updateSettings]);

  const disableBiometric = useCallback(() => {
    localStorage.removeItem(CRED_KEY);
    updateSettings((s) => {
      const methods = s.methods.filter((m) => m !== "biometric");
      return { ...s, methods, enabled: methods.length > 0 && s.enabled };
    });
  }, [updateSettings]);

  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!/^\d{4,10}$/.test(pin)) return false;
    const { hash, salt } = await hashPin(pin);
    localStorage.setItem(PIN_KEY, JSON.stringify({ hash, salt }));
    updateSettings((s) => ({
      ...s,
      enabled: true,
      methods: Array.from(new Set([...s.methods, "pin" as AppLockMethod])),
    }));
    return true;
  }, [updateSettings]);

  const removePin = useCallback(() => {
    localStorage.removeItem(PIN_KEY);
    updateSettings((s) => {
      const methods = s.methods.filter((m) => m !== "pin");
      return { ...s, methods, enabled: methods.length > 0 && s.enabled };
    });
  }, [updateSettings]);

  const setTimeoutValue = useCallback((sec: AppLockTimeout) => {
    updateSettings((s) => ({ ...s, timeoutSec: sec }));
  }, [updateSettings]);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const credIdB64 = localStorage.getItem(CRED_KEY);
      if (!credIdB64) return false;
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32).buffer as ArrayBuffer,
          allowCredentials: [
            {
              id: b64urlToBuf(credIdB64),
              type: "public-key",
              transports: ["internal", "hybrid"],
            },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
      if (!assertion) return false;
      hasUnlockedThisSession.current = true;
      setIsLocked(false);
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      return true;
    } catch (err) {
      console.error("App-Lock biometric unlock failed:", err);
      return false;
    }
  }, []);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const raw = localStorage.getItem(PIN_KEY);
      if (!raw) return false;
      const { hash, salt } = JSON.parse(raw);
      const { hash: check } = await hashPin(pin, salt);
      if (check !== hash) return false;
      hasUnlockedThisSession.current = true;
      setIsLocked(false);
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      return true;
    } catch {
      return false;
    }
  }, []);

  const lockNow = useCallback(() => {
    if (settings.enabled && settings.methods.length > 0) setIsLocked(true);
  }, [settings.enabled, settings.methods.length]);

  const disableAll = useCallback(() => {
    localStorage.removeItem(CRED_KEY);
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    updateSettings(() => ({ ...DEFAULT_SETTINGS }));
    setIsLocked(false);
  }, [updateSettings]);

  const value = useMemo<AppLockContextValue>(() => ({
    settings,
    isLocked,
    biometricAvailable,
    enableBiometric,
    disableBiometric,
    setPin,
    removePin,
    setTimeout: setTimeoutValue,
    unlockWithBiometric,
    unlockWithPin,
    lockNow,
    disableAll,
  }), [
    settings, isLocked, biometricAvailable, enableBiometric, disableBiometric,
    setPin, removePin, setTimeoutValue, unlockWithBiometric, unlockWithPin, lockNow, disableAll,
  ]);

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
};

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error("useAppLock must be used within AppLockProvider");
  return ctx;
}
