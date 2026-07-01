import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Lock, Delete } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppLock } from "@/contexts/AppLockContext";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

const AppLockScreen = () => {
  const { isLocked, settings, unlockWithBiometric, unlockWithPin } = useAppLock();
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const hasBiometric = settings.methods.includes("biometric");
  const hasPin = settings.methods.includes("pin");

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tryingBio, setTryingBio] = useState(false);
  const [mode, setMode] = useState<"biometric" | "pin">(hasBiometric ? "biometric" : "pin");

  // Reset when lock opens
  useEffect(() => {
    if (isLocked) {
      setPin("");
      setError(null);
      setMode(hasBiometric ? "biometric" : "pin");
    }
  }, [isLocked, hasBiometric]);

  // Auto-trigger biometric on open
  useEffect(() => {
    if (!isLocked || mode !== "biometric" || !hasBiometric || tryingBio) return;
    (async () => {
      setTryingBio(true);
      const ok = await unlockWithBiometric();
      setTryingBio(false);
      if (!ok) setError(tr("Entsperrung fehlgeschlagen", "Unlock failed"));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, mode, hasBiometric]);

  const submitPin = useCallback(async (value: string) => {
    const ok = await unlockWithPin(value);
    if (!ok) {
      setError(tr("Falscher PIN", "Wrong PIN"));
      setPin("");
    }
  }, [unlockWithPin]);

  const pressDigit = (d: string) => {
    setError(null);
    setPin((prev) => {
      const next = (prev + d).slice(0, 10);
      // Auto-submit at 6 digits (standard)
      if (next.length === 6) {
        void submitPin(next);
      }
      return next;
    });
  };
  const pressBack = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const tryBiometric = async () => {
    setError(null);
    setTryingBio(true);
    const ok = await unlockWithBiometric();
    setTryingBio(false);
    if (!ok) setError(tr("Entsperrung fehlgeschlagen", "Unlock failed"));
  };

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] bg-background flex flex-col items-center justify-center px-6 pt-safe pb-safe"
          role="dialog"
          aria-modal="true"
          aria-label={tr("App gesperrt", "App locked")}
        >
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center shadow-soft">
              <Lock className="w-9 h-9 text-primary-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold text-foreground">Clemio</h1>
              <p className="text-sm text-muted-foreground">
                {tr("App gesperrt – bitte entsperren", "App locked – please unlock")}
              </p>
            </div>

            {mode === "biometric" && hasBiometric && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={tryBiometric}
                  disabled={tryingBio}
                  className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
                  aria-label={tr("Biometrisch entsperren", "Unlock with biometrics")}
                >
                  <Fingerprint className="w-12 h-12 text-primary" />
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  {tryingBio
                    ? tr("Warte auf Bestätigung …", "Waiting for confirmation …")
                    : tr("Tippe zum Entsperren", "Tap to unlock")}
                </p>
                {hasPin && (
                  <button
                    onClick={() => { setMode("pin"); setError(null); }}
                    className="text-sm text-primary font-medium"
                  >
                    {tr("PIN verwenden", "Use PIN")}
                  </button>
                )}
              </div>
            )}

            {mode === "pin" && hasPin && (
              <div className="w-full flex flex-col items-center gap-6">
                {/* Dots */}
                <div className="flex items-center gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-3 h-3 rounded-full transition-colors",
                        i < pin.length ? "bg-primary" : "bg-border",
                      )}
                    />
                  ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                  {["1","2","3","4","5","6","7","8","9"].map((d) => (
                    <button
                      key={d}
                      onClick={() => pressDigit(d)}
                      className="h-16 rounded-2xl bg-card border border-border text-2xl font-medium hover:bg-secondary active:scale-95 transition"
                    >
                      {d}
                    </button>
                  ))}
                  {hasBiometric ? (
                    <button
                      onClick={() => setMode("biometric")}
                      className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-secondary active:scale-95 transition"
                      aria-label={tr("Biometrie", "Biometrics")}
                    >
                      <Fingerprint className="w-6 h-6" />
                    </button>
                  ) : <div />}
                  <button
                    onClick={() => pressDigit("0")}
                    className="h-16 rounded-2xl bg-card border border-border text-2xl font-medium hover:bg-secondary active:scale-95 transition"
                  >
                    0
                  </button>
                  <button
                    onClick={pressBack}
                    className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-secondary active:scale-95 transition"
                    aria-label={tr("Löschen", "Delete")}
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive text-center" role="alert">{error}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLockScreen;
