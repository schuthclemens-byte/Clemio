import { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon, RotateCcw, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { backgroundPresets, animatedPresets, type ChatBackground } from "@/contexts/ChatBackgroundContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { toast } from "sonner";

interface BackgroundPickerProps {
  open: boolean;
  onClose: () => void;
  current: ChatBackground;
  onSelect: (bg: ChatBackground) => void;
  onReset?: () => void;
  showReset?: boolean;
}

const BackgroundPicker = ({ open, onClose, current, onSelect, onReset, showReset }: BackgroundPickerProps) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { requirePremium, PaywallGate } = usePremiumGate();

  if (!open) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle ein Bild aus");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file);
      if (error) throw error;

      const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year for backgrounds
      onSelect({ type: "image", value: data?.signedUrl || "" });
      toast.success("Hintergrund gesetzt!");
      onClose();
    } catch {
      toast.error("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleAnimatedSelect = (bg: ChatBackground) => {
    if (!isPremium) {
      requirePremium(() => {
        onSelect(bg);
        onClose();
      });
      return;
    }
    onSelect(bg);
    onClose();
  };

  // Mini preview colors for animated presets
  const animatedColors: Record<string, string[]> = {
    aurora: ["hsl(120,70%,60%)", "hsl(200,70%,55%)", "hsl(280,60%,60%)"],
    particles: ["hsl(var(--primary))", "hsl(var(--primary))", "hsl(var(--primary))"],
    waves: ["hsl(200,80%,65%)", "hsl(220,70%,55%)", "hsl(180,60%,60%)"],
    nebula: ["hsl(280,60%,55%)", "hsl(320,50%,50%)", "hsl(240,60%,55%)"],
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
        <div
          className="w-full max-w-lg bg-card rounded-t-3xl p-5 pb-8 animate-reveal-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Chat-Hintergrund</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Static presets */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {backgroundPresets.map((preset, i) => {
              const isActive = current.type === preset.bg.type && current.value === preset.bg.value;
              return (
                <button
                  key={i}
                  onClick={() => { onSelect(preset.bg); onClose(); }}
                  className={cn(
                    "aspect-square rounded-xl border-2 transition-all active:scale-95 overflow-hidden flex items-center justify-center",
                    isActive ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                  )}
                  style={
                    preset.bg.type === "gradient"
                      ? { background: preset.bg.value }
                      : preset.bg.type === "color"
                        ? { backgroundColor: preset.bg.value }
                        : { backgroundColor: "hsl(var(--background))" }
                  }
                >
                  {preset.bg.type === "none" && (
                    <span className="text-[10px] text-muted-foreground font-medium">Standard</span>
                  )}
                </button>
              );
            })}

            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={cn(
                "aspect-square rounded-xl border-2 border-dashed border-border transition-all active:scale-95",
                "flex flex-col items-center justify-center gap-1 hover:border-primary/50",
                uploading && "opacity-50"
              )}
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Bild</span>
                </>
              )}
            </button>
          </div>

          {/* Animated presets (Premium) */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Animiert</span>
              {!isPremium && (
                <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Premium
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {animatedPresets.map((preset, i) => {
                const isActive = current.type === "animated" && current.value === preset.bg.value;
                const colors = animatedColors[preset.bg.value] || [];
                return (
                  <button
                    key={i}
                    onClick={() => handleAnimatedSelect(preset.bg)}
                    className={cn(
                      "relative aspect-square rounded-xl border-2 transition-all active:scale-95 overflow-hidden",
                      "flex flex-col items-center justify-center gap-1",
                      isActive ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    )}
                  >
                    {/* Animated preview circles */}
                    <div className="flex gap-0.5 mb-1">
                      {colors.map((c, ci) => (
                        <div
                          key={ci}
                          className="w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: c, animationDelay: `${ci * 0.3}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground">{preset.label}</span>
                    {!isPremium && (
                      <Crown className="absolute top-1 right-1 w-3 h-3 text-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset button for per-chat */}
          {showReset && onReset && (
            <button
              onClick={() => { onReset(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Zurück zum globalen Hintergrund</span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>
      <PaywallGate />
    </>
  );
};

export default BackgroundPicker;
