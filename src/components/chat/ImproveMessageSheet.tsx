import { useState, useCallback } from "react";
import { Wand2, Sparkles, Heart, Shield, Loader2, Check, Pencil, Send, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImproveMessageSheetProps {
  originalText: string;
  onAccept: (text: string) => void;
  onSend: (text: string) => void;
  onClose: () => void;
  onPlayVoice?: (text: string) => void;
}

type ImproveStyle = "clearer" | "calmer" | "friendlier";

const STYLES: { id: ImproveStyle; icon: typeof Wand2; labelDe: string; labelEn: string; colorClass: string }[] = [
  { id: "clearer", icon: Sparkles, labelDe: "Klarer", labelEn: "Clearer", colorClass: "text-blue-500" },
  { id: "calmer", icon: Shield, labelDe: "Ruhiger", labelEn: "Calmer", colorClass: "text-emerald-500" },
  { id: "friendlier", icon: Heart, labelDe: "Freundlicher", labelEn: "Friendlier", colorClass: "text-pink-500" },
];

const ImproveMessageSheet = ({ originalText, onAccept, onSend, onClose, onPlayVoice }: ImproveMessageSheetProps) => {
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const [selectedStyle, setSelectedStyle] = useState<ImproveStyle>("clearer");
  const [improvedText, setImprovedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const improve = useCallback(async (style: ImproveStyle) => {
    setSelectedStyle(style);
    setLoading(true);
    setImprovedText(null);
    setIsEditing(false);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("clemio-ki", {
        body: { mode: "improve", improveText: originalText, improveStyle: style, locale },
      });

      if (res.error) throw res.error;

      const data = res.data;
      if (data.error) {
        if (data.error === "LIMIT_REACHED") {
          toast.error(tr("Limit erreicht – hol dir Premium!", "Limit reached – upgrade to Premium!"));
        } else {
          throw new Error(data.error);
        }
        setLoading(false);
        return;
      }

      setImprovedText(data.improved || null);
      setEditText(data.improved || "");
    } catch (e) {
      console.error("Improve failed:", e);
      toast.error(tr("Verbesserung fehlgeschlagen", "Improvement failed"));
    }
    setLoading(false);
  }, [originalText, locale]);

  const currentText = isEditing ? editText : (improvedText || "");

  return (
    <div className="bg-card border-t border-border px-4 py-3 animate-fade-in space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{tr("Nachricht verbessern", "Improve message")}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors active:scale-90">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Original */}
      <div className="rounded-xl bg-secondary/50 px-3 py-2">
        <p className="text-[0.688rem] text-muted-foreground mb-0.5">{tr("Original", "Original")}</p>
        <p className="text-sm">{originalText}</p>
      </div>

      {/* Style pills */}
      <div className="flex gap-2">
        {STYLES.map((s) => {
          const Icon = s.icon;
          const active = selectedStyle === s.id && (improvedText || loading);
          return (
            <button
              key={s.id}
              onClick={() => improve(s.id)}
              disabled={loading}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95",
                active
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", !active && s.colorClass)} />
              {locale === "de" ? s.labelDe : s.labelEn}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{tr("Wird verbessert…", "Improving…")}</span>
        </div>
      )}

      {/* Improved result */}
      {improvedText && !loading && (
        <div className="space-y-2">
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5">
            <p className="text-[0.688rem] text-primary mb-0.5 font-medium">
              {tr("Verbessert", "Improved")} ✨
            </p>
            {isEditing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full text-sm bg-transparent border-none outline-none resize-none min-h-[2.5rem]"
                autoFocus
              />
            ) : (
              <p className="text-sm">{improvedText}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Edit toggle */}
            <button
              onClick={() => {
                if (isEditing) {
                  setImprovedText(editText);
                  setIsEditing(false);
                } else {
                  setEditText(improvedText);
                  setIsEditing(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs font-medium hover:bg-secondary/80 transition-colors active:scale-95"
            >
              {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {isEditing ? tr("Fertig", "Done") : tr("Bearbeiten", "Edit")}
            </button>

            {/* Play voice */}
            {onPlayVoice && (
              <button
                onClick={() => onPlayVoice(currentText)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs font-medium hover:bg-secondary/80 transition-colors active:scale-95"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {tr("Anhören", "Listen")}
              </button>
            )}

            {/* Accept (put in input) */}
            <button
              onClick={() => onAccept(currentText)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              {tr("Übernehmen", "Accept")}
            </button>

            {/* Send directly */}
            <button
              onClick={() => onSend(currentText)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-medium shadow-soft hover:shadow-elevated transition-all active:scale-95 ml-auto"
            >
              <Send className="w-3.5 h-3.5" />
              {tr("Senden", "Send")}
            </button>
          </div>
        </div>
      )}

      {/* Initial state – prompt to pick a style */}
      {!improvedText && !loading && (
        <p className="text-xs text-muted-foreground text-center py-2">
          {tr("Wähle einen Stil, um deine Nachricht zu verbessern", "Choose a style to improve your message")}
        </p>
      )}
    </div>
  );
};

export default ImproveMessageSheet;
