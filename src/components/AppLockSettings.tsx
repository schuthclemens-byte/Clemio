import { useState } from "react";
import { Fingerprint, KeyRound, Timer, ShieldCheck, Trash2 } from "lucide-react";
import { useAppLock, type AppLockTimeout } from "@/contexts/AppLockContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AppLockSettings = () => {
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);
  const {
    settings,
    biometricAvailable,
    enableBiometric,
    disableBiometric,
    setPin,
    removePin,
    setTimeout: setLockTimeout,
    disableAll,
  } = useAppLock();

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const hasBiometric = settings.methods.includes("biometric");
  const hasPin = settings.methods.includes("pin");

  const toggleBiometric = async () => {
    if (busy) return;
    if (hasBiometric) {
      disableBiometric();
      toast.success(tr("Biometrie deaktiviert", "Biometric disabled"));
      return;
    }
    setBusy(true);
    const ok = await enableBiometric();
    setBusy(false);
    if (ok) toast.success(tr("Biometrie aktiviert", "Biometric enabled"));
    else toast.error(tr("Aktivierung fehlgeschlagen", "Activation failed"));
  };

  const openPinDialog = () => {
    setPinInput("");
    setPinConfirm("");
    setShowPinDialog(true);
  };

  const savePin = async () => {
    if (!/^\d{4,10}$/.test(pinInput)) {
      toast.error(tr("PIN muss 4–10 Ziffern haben", "PIN must be 4–10 digits"));
      return;
    }
    if (pinInput !== pinConfirm) {
      toast.error(tr("PINs stimmen nicht überein", "PINs do not match"));
      return;
    }
    setBusy(true);
    const ok = await setPin(pinInput);
    setBusy(false);
    if (ok) {
      toast.success(tr("PIN gesetzt", "PIN set"));
      setShowPinDialog(false);
    } else {
      toast.error(tr("PIN konnte nicht gespeichert werden", "Could not save PIN"));
    }
  };

  const TIMEOUT_OPTIONS: { value: AppLockTimeout; label: string }[] = [
    { value: 0, label: tr("Sofort", "Immediately") },
    { value: 60, label: tr("Nach 1 Minute", "After 1 minute") },
    { value: 300, label: tr("Nach 5 Minuten", "After 5 minutes") },
    { value: 900, label: tr("Nach 15 Minuten", "After 15 minutes") },
  ];

  const anyEnabled = hasBiometric || hasPin;

  return (
    <div className="space-y-2 pb-4">
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        {/* Biometric */}
        <button
          onClick={toggleBiometric}
          disabled={!biometricAvailable || busy}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors border-b border-border",
            "hover:bg-secondary/50 active:scale-[0.99] disabled:opacity-60",
          )}
          role="switch"
          aria-checked={hasBiometric}
        >
          <span className="flex items-start gap-3 flex-1 min-w-0">
            <Fingerprint className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-[0.938rem] block font-medium">
                {tr("Biometrie (FaceID / TouchID / Fingerabdruck)", "Biometrics (FaceID / TouchID / Fingerprint)")}
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {biometricAvailable
                  ? tr("Nutze die Entsperrmethode deines Geräts", "Use your device's unlock method")
                  : tr("Auf diesem Gerät nicht verfügbar", "Not available on this device")}
              </span>
            </div>
          </span>
          <div className={cn(
            "w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ml-3",
            hasBiometric ? "bg-primary" : "bg-border",
          )}>
            <div className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
              hasBiometric ? "translate-x-[1.375rem]" : "translate-x-0.5",
            )} />
          </div>
        </button>

        {/* PIN */}
        <div className={cn("flex items-center justify-between px-4 py-3.5", hasPin && "border-b border-border")}>
          <span className="flex items-start gap-3 flex-1 min-w-0">
            <KeyRound className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-[0.938rem] block font-medium">
                {tr("PIN-Code", "PIN code")}
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {hasPin
                  ? tr("PIN ist aktiv (4–10 Ziffern)", "PIN is active (4–10 digits)")
                  : tr("Fallback, falls Biometrie nicht klappt", "Fallback if biometrics fail")}
              </span>
            </div>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openPinDialog}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary"
            >
              {hasPin ? tr("Ändern", "Change") : tr("Setzen", "Set")}
            </button>
            {hasPin && (
              <button
                onClick={() => { removePin(); toast.success(tr("PIN entfernt", "PIN removed")); }}
                className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"
                aria-label={tr("PIN entfernen", "Remove PIN")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeout */}
      {anyEnabled && (
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{tr("Automatisch sperren", "Auto-lock")}</span>
          </div>
          <div className="p-2 grid grid-cols-2 gap-2">
            {TIMEOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLockTimeout(opt.value)}
                className={cn(
                  "px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  settings.timeoutSec === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status / disable-all */}
      {anyEnabled ? (
        <div className="bg-card rounded-2xl shadow-sm p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{tr("App-Sperre aktiv", "App lock active")}</p>
            <p className="text-xs text-muted-foreground">
              {tr(
                "Wird nach Inaktivität ausgelöst. Der Schutz gilt nur auf diesem Gerät.",
                "Triggers after inactivity. Protection applies only on this device.",
              )}
            </p>
            <button
              onClick={() => {
                disableAll();
                toast.success(tr("App-Sperre deaktiviert", "App lock disabled"));
              }}
              className="mt-3 text-xs font-semibold text-destructive"
            >
              {tr("Alles deaktivieren", "Disable everything")}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground px-2">
          {tr(
            "Aktiviere Biometrie oder setze einen PIN, um Clemio zusätzlich zu schützen.",
            "Enable biometrics or set a PIN to add extra protection to Clemio.",
          )}
        </p>
      )}

      {/* PIN dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowPinDialog(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4"
          >
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold">{tr("PIN festlegen", "Set PIN")}</h2>
              <p className="text-xs text-muted-foreground">
                {tr("4 bis 10 Ziffern", "4 to 10 digits")}
              </p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder={tr("Neuer PIN", "New PIN")}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder={tr("PIN wiederholen", "Confirm PIN")}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPinDialog(false)}
                className="flex-1 py-3 rounded-xl bg-secondary text-sm font-medium"
              >
                {tr("Abbrechen", "Cancel")}
              </button>
              <button
                onClick={savePin}
                disabled={busy}
                className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {tr("Speichern", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLockSettings;
