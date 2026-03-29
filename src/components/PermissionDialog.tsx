import { Mic, Camera, Bell, ShieldCheck, X, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback } from "react";

export type PermissionType = "microphone" | "camera" | "push";

interface PermissionDialogProps {
  open: boolean;
  type: PermissionType;
  onAllow: () => void;
  onCancel: () => void;
}

const CONTENT: Record<PermissionType, {
  icon: typeof Mic;
  title: string;
  description: string;
  benefit: string;
  warning: string;
  allowLabel: string;
}> = {
  microphone: {
    icon: Mic,
    title: "Mikrofon-Zugriff erlauben",
    description: "Um Sprachnachrichten aufzunehmen oder Anrufe zu tätigen, braucht Clemio Zugriff auf dein Mikrofon.",
    benefit: "Du kannst dann Sprachnachrichten aufnehmen und an Audio- und Videoanrufen teilnehmen.",
    warning: "Ohne Mikrofon-Zugriff kannst du nur Text- und Bildnachrichten senden.",
    allowLabel: "Mikrofon erlauben",
  },
  camera: {
    icon: Camera,
    title: "Kamera-Zugriff erlauben",
    description: "Um Fotos und Videos aufzunehmen oder Videoanrufe zu starten, braucht Clemio Zugriff auf deine Kamera.",
    benefit: "Du kannst dann Fotos direkt aus dem Chat aufnehmen und per Video telefonieren.",
    warning: "Ohne Kamera-Zugriff kannst du nur Bilder aus deiner Galerie senden.",
    allowLabel: "Kamera erlauben",
  },
  push: {
    icon: Bell,
    title: "Benachrichtigungen erlauben",
    description: "Damit du keine Nachricht verpasst, möchte Clemio dir Push-Benachrichtigungen senden.",
    benefit: "Du wirst über neue Nachrichten und Anrufe informiert – auch wenn die App geschlossen ist.",
    warning: "Ohne Benachrichtigungen siehst du neue Nachrichten erst beim nächsten Öffnen der App.",
    allowLabel: "Benachrichtigungen erlauben",
  },
};

const PermissionDialog = ({ open, type, onAllow, onCancel }: PermissionDialogProps) => {
  const content = CONTENT[type];
  const Icon = content.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-auto bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-border p-6 pb-8 space-y-5"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Icon className="w-8 h-8 text-primary-foreground" />
            </div>

            {/* Title + description */}
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-foreground">{content.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.description}</p>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{content.benefit}</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary">
                <Settings className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{content.warning}</p>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={onAllow}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm gradient-primary text-primary-foreground shadow-soft active:scale-[0.97] transition-transform"
            >
              <Icon className="w-4 h-4" />
              {content.allowLabel}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Später
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PermissionDialog;
