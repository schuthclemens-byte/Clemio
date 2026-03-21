import { useState } from "react";
import { Mic, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceConsentPopupProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

const VoiceConsentPopup = ({ open, onAccept, onCancel }: VoiceConsentPopupProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated overflow-hidden animate-reveal-up">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="pt-10 pb-4 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold mb-2">Einwilligung zur Nutzung deiner Stimme</h2>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          <div className="bg-secondary/50 rounded-xl p-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>Ich bestätige, dass ich meine Stimme <strong className="text-foreground">freiwillig</strong> zur Verfügung stelle.</p>
            <p>
              Ich stimme zu, dass meine Sprachaufnahme verwendet wird, um eine künstliche Stimme zu erstellen, 
              die <strong className="text-foreground">innerhalb der App</strong> genutzt wird.
            </p>
            <p>
              Ich kann diese Einwilligung <strong className="text-foreground">jederzeit widerrufen</strong> und 
              meine Stimme löschen.
            </p>
          </div>

          {/* Trust line */}
          <div className="flex items-center gap-2 px-1">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground">
              Stimmen werden nur mit deiner Zustimmung verwendet und können jederzeit gelöscht werden.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={onAccept}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all active:scale-[0.97]"
          >
            Zustimmen
          </button>
          <button
            onClick={onCancel}
            className="w-full h-11 rounded-xl bg-secondary/50 text-muted-foreground text-sm font-medium hover:bg-secondary transition-colors active:scale-[0.97]"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceConsentPopup;
