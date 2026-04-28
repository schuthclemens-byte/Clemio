import { useState, useRef, useCallback, useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

type CaptionsStatus = "checking" | "ready" | "unsupported" | "permission-denied" | "error";

interface CaptionsDebugStatus {
  sessionId: number;
  mode: "native" | "browser" | "unknown";
  lastStatus: string;
}

interface UseLiveCaptionsReturn {
  isEnabled: boolean;
  caption: string;
  toggleCaptions: () => void;
  startCaptions: (lang?: string) => void;
  stopCaptions: () => void;
  restartCaptions: (lang?: string) => void;
  isSupported: boolean;
  isChecking: boolean;
  status: CaptionsStatus;
  errorMessage: string | null;
  debugStatus: CaptionsDebugStatus;
}

export function useLiveCaptions(): UseLiveCaptionsReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<CaptionsStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastDebugStatus, setLastDebugStatus] = useState("checking-support");
  const recognitionRef = useRef<any>(null);
  const nativeListeningRef = useRef(false);
  const nativeListenersRef = useRef<PluginListenerHandle[]>([]);
  const sessionIdRef = useRef(0);
  const mountedRef = useRef(true);
  const restartTimerRef = useRef<number | null>(null);
  const nativeStopInFlightRef = useRef<Promise<void> | null>(null);

  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const browserSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const isSupported = status === "ready";
  const isChecking = status === "checking";
  const debugStatus: CaptionsDebugStatus = {
    sessionId: sessionIdRef.current,
    mode: typeof window === "undefined" ? "unknown" : isNative ? "native" : "browser",
    lastStatus: lastDebugStatus,
  };

  const isCurrentSession = useCallback((sessionId: number) => {
    return mountedRef.current && sessionIdRef.current === sessionId;
  }, []);

  const clearBrowserRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;

    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;

    try {
      recognition.stop();
    } catch {
      // SpeechRecognition can throw if it is already stopped. The call must continue.
    }
  }, []);

  const removeNativeListeners = useCallback(async () => {
    const listeners = nativeListenersRef.current;
    nativeListenersRef.current = [];
    await Promise.all(listeners.map((listener) => listener.remove().catch(() => undefined)));
  }, []);

  const safeStopNative = useCallback(async () => {
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      await SpeechRecognition.stop().catch(() => undefined);
    } catch {
      // Native plugin may be unavailable on some builds/devices. The call must continue.
    }
  }, []);

  const cleanupCaptions = useCallback((resetState = true) => {
    sessionIdRef.current += 1;
    setLastDebugStatus(resetState ? "stopped" : "cleanup");
    nativeListeningRef.current = false;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    clearBrowserRecognition();
    void removeNativeListeners();
    if (isNative) {
      const stopPromise = safeStopNative();
      const trackedStopPromise = stopPromise.finally(() => {
        if (nativeStopInFlightRef.current === trackedStopPromise) {
          nativeStopInFlightRef.current = null;
        }
      });
      nativeStopInFlightRef.current = trackedStopPromise;
    }

    if (resetState && mountedRef.current) {
      setIsEnabled(false);
      setCaption("");
    }
  }, [clearBrowserRecognition, isNative, removeNativeListeners, safeStopNative]);

  useEffect(() => {
    if (!isNative) {
      setStatus(browserSupported ? "ready" : "unsupported");
      setLastDebugStatus(browserSupported ? "browser-ready" : "browser-unsupported");
      setErrorMessage(browserSupported ? null : "Untertitel werden auf diesem Gerät nicht unterstützt.");
      return;
    }

    let active = true;
    setStatus("checking");
    setLastDebugStatus("native-checking");
    setErrorMessage(null);

    import("@capacitor-community/speech-recognition")
      .then(({ SpeechRecognition }) => SpeechRecognition.available())
      .then(({ available }) => {
        if (!active) return;
        setStatus(available ? "ready" : "unsupported");
        setLastDebugStatus(available ? "native-ready" : "native-unsupported");
        setErrorMessage(available ? null : "Untertitel werden auf diesem Gerät nicht unterstützt.");
      })
      .catch(() => {
        if (!active) return;
        setStatus("unsupported");
        setLastDebugStatus("native-import-failed");
        setErrorMessage("Untertitel sind in dieser App-Version nicht verfügbar.");
      });

    return () => {
      active = false;
    };
  }, [browserSupported, isNative]);

  const startCaptions = useCallback((lang = "de-DE") => {
    if (!isSupported) return;
    cleanupCaptions(false);
    const sessionId = sessionIdRef.current;
    setLastDebugStatus(`starting:${sessionId}`);
    setErrorMessage(null);

    if (isNative) {
      void (async () => {
        await nativeStopInFlightRef.current?.catch(() => undefined);
        if (!isCurrentSession(sessionId)) return;
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        if (!isCurrentSession(sessionId)) return;
        const availability = await SpeechRecognition.available().catch(() => ({ available: false }));
        if (!isCurrentSession(sessionId)) return;
        if (!availability.available) {
          setStatus("unsupported");
          setLastDebugStatus(`unsupported:${sessionId}`);
          setErrorMessage("Untertitel werden auf diesem Gerät nicht unterstützt.");
          cleanupCaptions();
          return;
        }

        const permissions = await SpeechRecognition.checkPermissions();
        if (!isCurrentSession(sessionId)) return;
        if (permissions.speechRecognition !== "granted") {
          const requested = await SpeechRecognition.requestPermissions();
          if (!isCurrentSession(sessionId)) return;
          if (requested.speechRecognition !== "granted") {
            setStatus("permission-denied");
            setLastDebugStatus(`permission-denied:${sessionId}`);
            setErrorMessage("Mikrofon- oder Spracherkennung-Berechtigung fehlt.");
            cleanupCaptions();
            return;
          }
        }

        await removeNativeListeners();
        if (!isCurrentSession(sessionId)) return;
        nativeListeningRef.current = true;

        const partialListener = await SpeechRecognition.addListener("partialResults", (data) => {
          if (!isCurrentSession(sessionId)) return;
          setCaption(data.matches?.[0] ?? "");
        });
        const stateListener = await SpeechRecognition.addListener("listeningState", async (data) => {
          if (data.status === "stopped" && nativeListeningRef.current && isCurrentSession(sessionId)) {
            try {
              await SpeechRecognition.start({ language: lang, maxResults: 1, partialResults: true, popup: false });
            } catch {
              if (!isCurrentSession(sessionId)) return;
              cleanupCaptions();
              setStatus("error");
              setLastDebugStatus(`native-restart-error:${sessionId}`);
              setErrorMessage("Untertitel wurden auf diesem Gerät beendet.");
            }
          }
        });
        nativeListenersRef.current = [partialListener, stateListener];
        setLastDebugStatus(`native-listeners-ready:${sessionId}`);
        if (!isCurrentSession(sessionId)) {
          await removeNativeListeners();
          return;
        }

        const result = await SpeechRecognition.start({ language: lang, maxResults: 1, partialResults: true, popup: false });
        if (!isCurrentSession(sessionId)) return;
        if (result.matches?.[0]) setCaption(result.matches[0]);
        setLastDebugStatus(`native-started:${sessionId}`);
        setIsEnabled(true);
      })().catch(() => {
        if (!isCurrentSession(sessionId)) return;
        cleanupCaptions();
        setStatus("error");
        setLastDebugStatus(`native-start-error:${sessionId}`);
        setErrorMessage("Untertitel konnten nicht gestartet werden.");
      });
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setStatus("unsupported");
      setLastDebugStatus(`browser-unsupported:${sessionId}`);
      setErrorMessage("Untertitel werden auf diesem Gerät nicht unterstützt.");
      cleanupCaptions();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isCurrentSession(sessionId) || recognitionRef.current !== recognition) return;
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setCaption(text);
    };

    recognition.onend = () => {
      if (isCurrentSession(sessionId) && recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isCurrentSession(sessionId) || recognitionRef.current !== recognition) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        cleanupCaptions();
        setStatus("permission-denied");
        setLastDebugStatus(`browser-permission-denied:${sessionId}`);
        setErrorMessage("Mikrofon- oder Spracherkennung-Berechtigung fehlt.");
      }
    };

    try {
      recognition.start();
      if (!isCurrentSession(sessionId)) {
        clearBrowserRecognition();
        return;
      }
      recognitionRef.current = recognition;
      setLastDebugStatus(`browser-started:${sessionId}`);
      setIsEnabled(true);
    } catch {
      cleanupCaptions();
      setStatus("error");
      setLastDebugStatus(`browser-start-error:${sessionId}`);
      setErrorMessage("Untertitel konnten nicht gestartet werden.");
    }
  }, [cleanupCaptions, clearBrowserRecognition, isCurrentSession, isNative, isSupported, removeNativeListeners]);

  const stopCaptions = useCallback(() => {
    cleanupCaptions();
  }, [cleanupCaptions]);

  const restartCaptions = useCallback((lang = "de-DE") => {
    cleanupCaptions();
    setLastDebugStatus("restart-scheduled");
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (mountedRef.current && isSupported) {
        startCaptions(lang);
      }
    }, 150);
  }, [cleanupCaptions, isSupported, startCaptions]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupCaptions(false);
    };
  }, [cleanupCaptions]);

  const toggleCaptions = useCallback(() => {
    if (isEnabled) {
      stopCaptions();
    } else {
      startCaptions();
    }
  }, [isEnabled, startCaptions, stopCaptions]);

  return { isEnabled, caption, toggleCaptions, startCaptions, stopCaptions, restartCaptions, isSupported, isChecking, status, errorMessage, debugStatus };
}
