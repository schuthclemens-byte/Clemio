import { Mic, Camera, Bell, ShieldCheck, X, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback } from "react";
import { useI18n } from "@/contexts/I18nContext";

export type PermissionType = "microphone" | "camera" | "push";

interface PermissionDialogProps {
  open: boolean;
  type: PermissionType;
  onAllow: () => void;
  onCancel: () => void;
}

const PermissionDialog = ({ open, type, onAllow, onCancel }: PermissionDialogProps) => {
  const { locale } = useI18n();
  const tr = useCallback((de: string, en: string) => (locale === "de" ? de : en), [locale]);
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
      title: tr("Mikrofon-Zugriff erlauben", "Allow microphone access"),
      description: tr("Um Sprachnachrichten aufzunehmen oder Anrufe zu tätigen, braucht Clemio Zugriff auf dein Mikrofon.", "Clemio needs access to your microphone to record voice messages or make calls."),
      benefit: tr("Du kannst dann Sprachnachrichten aufnehmen und an Audio- und Videoanrufen teilnehmen.", "You can record voice messages and join audio and video calls."),
      warning: tr("Ohne Mikrofon-Zugriff kannst du nur Text- und Bildnachrichten senden.", "Without microphone access, you can only send text and image messages."),
      allowLabel: tr("Mikrofon erlauben", "Allow microphone"),
    },
    camera: {
      icon: Camera,
      title: tr("Kamera-Zugriff erlauben", "Allow camera access"),
      description: tr("Um Fotos und Videos aufzunehmen oder Videoanrufe zu starten, braucht Clemio Zugriff auf deine Kamera.", "Clemio needs access to your camera to take photos, record videos, or start video calls."),
      benefit: tr("Du kannst dann Fotos direkt aus dem Chat aufnehmen und per Video telefonieren.", "You can take photos directly from the chat and make video calls."),
      warning: tr("Ohne Kamera-Zugriff kannst du nur Bilder aus deiner Galerie senden.", "Without camera access, you can only send images from your gallery."),
      allowLabel: tr("Kamera erlauben", "Allow camera"),
    },
    push: {
      icon: Bell,
      title: tr("Benachrichtigungen erlauben", "Allow notifications"),
      description: tr("Damit du keine Nachricht verpasst, möchte Clemio dir Push-Benachrichtigungen senden.", "Clemio would like to send push notifications so you don't miss any messages."),
      benefit: tr("Du wirst über neue Nachrichten und Anrufe informiert – auch wenn die App geschlossen ist.", "You'll be notified about new messages and calls even when the app is closed."),
      warning: tr("Ohne Benachrichtigungen siehst du neue Nachrichten erst beim nächsten Öffnen der App.", "Without notifications, you'll only see new messages the next time you open the app."),
      allowLabel: tr("Benachrichtigungen erlauben", "Allow notifications"),
    },
  };
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
              aria-label={tr("Schließen", "Close")}
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
              {tr("Später", "Later")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PermissionDialog;
