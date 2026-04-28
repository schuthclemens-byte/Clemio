import { useState, useRef, useCallback, useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

type CaptionsStatus = "checking" | "ready" | "unsupported" | "permission-denied" | "error";

interface UseLiveCaptionsReturn {
  isEnabled: boolean;
  caption: string;
  toggleCaptions: () => void;
  startCaptions: (lang?: string) => void;
  stopCaptions: () => void;
  isSupported: boolean;
  isChecking: boolean;
  status: CaptionsStatus;
  errorMessage: string | null;
}

export function useLiveCaptions(): UseLiveCaptionsReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<CaptionsStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const nativeListeningRef = useRef(false);
  const nativeListenersRef = useRef<PluginListenerHandle[]>([]);
  const sessionIdRef = useRef(0);
  const mountedRef = useRef(true);

  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const browserSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const isSupported = status === "ready";
  const isChecking = status === "checking";

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
    } finally {
      await removeNativeListeners();
    }
  }, [removeNativeListeners]);

  const cleanupCaptions = useCallback((resetState = true) => {
    sessionIdRef.current += 1;
    nativeListeningRef.current = false;
    clearBrowserRecognition();
    if (isNative) {
      void safeStopNative();
    } else {
      void removeNativeListeners();
    }

    if (resetState && mountedRef.current) {
      setIsEnabled(false);
      setCaption("");
    }
  }, [clearBrowserRecognition, isNative, removeNativeListeners, safeStopNative]);

  useEffect(() => {
    if (!isNative) {
      setStatus(browserSupported ? "ready" : "unsupported");
      setErrorMessage(browserSupported ? null : "Untertitel werden auf diesem Gerät nicht unterstützt.");
      return;
    }

    let active = true;
    setStatus("checking");
    setErrorMessage(null);

    import("@capacitor-community/speech-recognition")
      .then(({ SpeechRecognition }) => SpeechRecognition.available())
      .then(({ available }) => {
        if (!active) return;
        setStatus(available ? "ready" : "unsupported");
        setErrorMessage(available ? null : "Untertitel werden auf diesem Gerät nicht unterstützt.");
      })
      .catch(() => {
        if (!active) return;
        setStatus("unsupported");
        setErrorMessage("Untertitel sind in dieser App-Version nicht verfügbar.");
      });

    return () => {
      active = false;
    };
  }, [browserSupported, isNative]);

  const startCaptions = useCallback((lang = "de-DE") => {
    if (!isSupported) return;
    setErrorMessage(null);

    if (isNative) {
      void (async () => {
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        const availability = await SpeechRecognition.available().catch(() => ({ available: false }));
        if (!availability.available) {
          setStatus("unsupported");
          setErrorMessage("Untertitel werden auf diesem Gerät nicht unterstützt.");
          return;
        }

        const permissions = await SpeechRecognition.checkPermissions();
        if (permissions.speechRecognition !== "granted") {
          const requested = await SpeechRecognition.requestPermissions();
          if (requested.speechRecognition !== "granted") {
            setStatus("permission-denied");
            setErrorMessage("Mikrofon- oder Spracherkennung-Berechtigung fehlt.");
            return;
          }
        }

        await removeNativeListeners();
        nativeListeningRef.current = true;

        const partialListener = await SpeechRecognition.addListener("partialResults", (data) => {
          setCaption(data.matches?.[0] ?? "");
        });
        const stateListener = await SpeechRecognition.addListener("listeningState", async (data) => {
          if (data.status === "stopped" && nativeListeningRef.current) {
            try {
              await SpeechRecognition.start({ language: lang, maxResults: 1, partialResults: true, popup: false });
            } catch {
              nativeListeningRef.current = false;
              setIsEnabled(false);
              setCaption("");
              setStatus("error");
              setErrorMessage("Untertitel wurden auf diesem Gerät beendet.");
              await removeNativeListeners();
            }
          }
        });
        nativeListenersRef.current = [partialListener, stateListener];

        const result = await SpeechRecognition.start({ language: lang, maxResults: 1, partialResults: true, popup: false });
        if (result.matches?.[0]) setCaption(result.matches[0]);
        setIsEnabled(true);
      })().catch(() => {
        nativeListeningRef.current = false;
        setIsEnabled(false);
        setCaption("");
        setStatus("error");
        setErrorMessage("Untertitel konnten nicht gestartet werden.");
        void removeNativeListeners();
      });
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setStatus("unsupported");
      setErrorMessage("Untertitel werden auf diesem Gerät nicht unterstützt.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setCaption(text);
    };

    recognition.onend = () => {
      // Restart if still enabled
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        recognitionRef.current = null;
        setIsEnabled(false);
        setCaption("");
        setStatus("permission-denied");
        setErrorMessage("Mikrofon- oder Spracherkennung-Berechtigung fehlt.");
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsEnabled(true);
    } catch {
      recognitionRef.current = null;
      setIsEnabled(false);
      setCaption("");
      setStatus("error");
      setErrorMessage("Untertitel konnten nicht gestartet werden.");
    }
  }, [isNative, isSupported, removeNativeListeners]);

  const stopCaptions = useCallback(() => {
    nativeListeningRef.current = false;
    if (isNative) {
      void safeStopNative();
    }
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
    setIsEnabled(false);
    setCaption("");
  }, [isNative, safeStopNative]);

  useEffect(() => {
    return () => {
      nativeListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {}
      if (isNative) {
        void safeStopNative();
      }
    };
  }, [isNative, safeStopNative]);

  const toggleCaptions = useCallback(() => {
    if (isEnabled) {
      stopCaptions();
    } else {
      startCaptions();
    }
  }, [isEnabled, startCaptions, stopCaptions]);

  return { isEnabled, caption, toggleCaptions, startCaptions, stopCaptions, isSupported, isChecking, status, errorMessage };
}
