import { useState, useRef, useCallback, useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

interface UseLiveCaptionsReturn {
  isEnabled: boolean;
  caption: string;
  toggleCaptions: () => void;
  startCaptions: (lang?: string) => void;
  stopCaptions: () => void;
  isSupported: boolean;
}

export function useLiveCaptions(): UseLiveCaptionsReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [caption, setCaption] = useState("");
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const recognitionRef = useRef<any>(null);
  const nativeListeningRef = useRef(false);
  const nativeListenersRef = useRef<PluginListenerHandle[]>([]);

  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const browserSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const isSupported = isNative ? nativeAvailable : browserSupported;

  useEffect(() => {
    if (!isNative) return;
    let active = true;
    import("@capacitor-community/speech-recognition")
      .then(({ SpeechRecognition }) => SpeechRecognition.available())
      .then(({ available }) => {
        if (active) setNativeAvailable(Boolean(available));
      })
      .catch(() => {
        if (active) setNativeAvailable(false);
      });

    return () => {
      active = false;
    };
  }, [isNative]);

  const startCaptions = useCallback((lang = "de-DE") => {
    if (!isSupported) return;

    if (isNative) {
      void (async () => {
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        const permissions = await SpeechRecognition.checkPermissions();
        if (permissions.speechRecognition !== "granted") {
          const requested = await SpeechRecognition.requestPermissions();
          if (requested.speechRecognition !== "granted") return;
        }

        await Promise.all(nativeListenersRef.current.map((listener) => listener.remove()));
        nativeListenersRef.current = [];
        nativeListeningRef.current = true;

        const partialListener = await SpeechRecognition.addListener("partialResults", (data) => {
          setCaption(data.matches?.[0] ?? "");
        });
        const stateListener = await SpeechRecognition.addListener("listeningState", async (data) => {
          if (data.status === "stopped" && nativeListeningRef.current) {
            try {
              await SpeechRecognition.start({ language: lang, maxResults: 1, partialResults: true, popup: false });
            } catch {}
          }
        });
        nativeListenersRef.current = [partialListener, stateListener];

        const result = await SpeechRecognition.start({ language: lang, maxResults: 1, partialResults: true, popup: false });
        if (result.matches?.[0]) setCaption(result.matches[0]);
        setIsEnabled(true);
      })().catch(() => {
        nativeListeningRef.current = false;
        setIsEnabled(false);
      });
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

    recognition.onerror = () => {};

    recognition.start();
    recognitionRef.current = recognition;
    setIsEnabled(true);
  }, [isNative, isSupported]);

  const stopCaptions = useCallback(() => {
    nativeListeningRef.current = false;
    if (isNative) {
      void import("@capacitor-community/speech-recognition").then(async ({ SpeechRecognition }) => {
        await SpeechRecognition.stop().catch(() => undefined);
        await Promise.all(nativeListenersRef.current.map((listener) => listener.remove()));
        nativeListenersRef.current = [];
      });
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsEnabled(false);
    setCaption("");
  }, [isNative]);

  useEffect(() => {
    return () => {
      nativeListeningRef.current = false;
      recognitionRef.current?.stop();
      if (isNative) {
        void import("@capacitor-community/speech-recognition").then(async ({ SpeechRecognition }) => {
          await SpeechRecognition.stop().catch(() => undefined);
          await Promise.all(nativeListenersRef.current.map((listener) => listener.remove()));
          nativeListenersRef.current = [];
        });
      }
    };
  }, [isNative]);

  const toggleCaptions = useCallback(() => {
    if (isEnabled) {
      stopCaptions();
    } else {
      startCaptions();
    }
  }, [isEnabled, startCaptions, stopCaptions]);

  return { isEnabled, caption, toggleCaptions, startCaptions, stopCaptions, isSupported };
}
