import { useState, useRef, useCallback } from "react";

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
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startCaptions = useCallback((lang = "de-DE") => {
    if (!isSupported) return;

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
  }, [isSupported]);

  const stopCaptions = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsEnabled(false);
    setCaption("");
  }, []);

  const toggleCaptions = useCallback(() => {
    if (isEnabled) {
      stopCaptions();
    } else {
      startCaptions();
    }
  }, [isEnabled, startCaptions, stopCaptions]);

  return { isEnabled, caption, toggleCaptions, startCaptions, stopCaptions, isSupported };
}
