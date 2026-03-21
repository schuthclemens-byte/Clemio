import { Crown, Mic, Globe, Headphones, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaywallDialogProps {
  open: boolean;
  onClose: () => void;
}

const features = [
  { icon: Mic, label: "Stimmen-Klonen", desc: "Nachrichten in echter Stimme hören" },
  { icon: Globe, label: "Echtzeit-Übersetzung", desc: "Nachrichten automatisch übersetzen" },
  { icon: Headphones, label: "Auto-Abspielen", desc: "Automatisch bei Kopfhörern abspielen" },
  { icon: Sparkles, label: "Premium Stimmen", desc: "Hochwertige, natürliche Stimmen" },
];

const PaywallDialog = ({ open, onClose }: PaywallDialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated overflow-hidden animate-reveal-up">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="pt-10 pb-6 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-soft">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Erlebe Kommunikation neu</h2>
          <p className="text-muted-foreground text-sm">
            Höre Nachrichten wie echte Gespräche
          </p>
        </div>

        {/* Features */}
        <div className="px-6 space-y-3 pb-6">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-4">
          <button
            onClick={onClose}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all active:scale-[0.97]"
          >
            Kostenlos testen
          </button>
        </div>

        {/* Legal */}
        <p className="text-center text-xs text-muted-foreground px-6 pb-6">
          7 Tage kostenlos testen. Danach 4,99€/Monat. Jederzeit kündbar in den Einstellungen.
        </p>
      </div>
    </div>
  );
};

export default PaywallDialog;
