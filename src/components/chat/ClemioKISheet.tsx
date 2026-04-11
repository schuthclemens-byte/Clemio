import { useState, useEffect } from "react";
import { Sparkles, Copy, Send, ChevronUp, Loader2, Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/contexts/I18nContext";

interface Answer {
  text: string;
  effect?: string;
}

interface KIResponse {
  assessment?: string;
  answers: Answer[];
  remaining?: number;
  limit?: number;
  isPremium?: boolean;
}

interface ClemioKISheetProps {
  open: boolean;
  onClose: () => void;
  receivedMessage: string;
  chatHistory: { text: string; isMine: boolean }[];
  isPremium: boolean;
  onUseSuggestion: (text: string) => void;
}

const ClemioKISheet = ({
  open,
  onClose,
  receivedMessage,
  chatHistory,
  isPremium,
  onUseSuggestion,
}: ClemioKISheetProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<KIResponse | null>(null);
  const [mode, setMode] = useState<"standard" | "strategy">("standard");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(3);

  useEffect(() => {
    if (!open) return;
    const checkUsage = async () => {
      try {
        const { data } = await supabase.functions.invoke("clemio-ki", {
          body: { checkOnly: true },
        });
        if (data) {
          setRemaining(data.isPremium ? -1 : data.remaining);
          setLimit(data.limit);
        }
      } catch {}
    };
    checkUsage();
  }, [open]);

  const generate = async (selectedMode: "standard" | "strategy") => {
    if (selectedMode === "strategy" && !isPremium) {
      toast(t("ki.strategyLocked"));
      return;
    }

    if (!isPremium && remaining !== null && remaining <= 0) {
      toast(t("ki.limitDesc"));
      return;
    }

    setLoading(true);
    setResponse(null);
    setMode(selectedMode);

    try {
      const { data, error } = await supabase.functions.invoke("clemio-ki", {
        body: {
          receivedMessage,
          chatHistory: chatHistory.slice(-5),
          mode: selectedMode,
          locale,
        },
      });

      if (error) {
        try {
          const errBody = JSON.parse(error.message || "{}");
          if (errBody.error === "LIMIT_REACHED") {
            setRemaining(0);
            toast(errBody.message || t("ki.limitDesc"));
            return;
          }
        } catch {}
        toast.error(t("ki.thinking").replace("…", " – Error"));
        return;
      }

      if (data?.error === "LIMIT_REACHED") {
        setRemaining(0);
        toast(data.message || t("ki.limitDesc"));
        return;
      }

      setResponse(data as KIResponse);
      if (data?.remaining !== undefined) {
        setRemaining(data.isPremium ? -1 : data.remaining);
      }
    } catch (err) {
      console.error("Clemio-KI error:", err);
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast(t("ki.copied"));
  };

  const handleUse = (text: string) => {
    onUseSuggestion(text);
    onClose();
  };

  const limitReached = !isPremium && remaining !== null && remaining <= 0;

  const remainingText = remaining !== null && remaining >= 0
    ? t("ki.remaining")
        .replace("{n}", String(remaining))
        .replace("{s}", remaining !== 1 ? "n" : "")
    : "";

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); setResponse(null); } }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("ki.title")}
            </span>
            {remaining !== null && remaining >= 0 && (
              <span className={cn(
                "text-xs font-normal px-2.5 py-1 rounded-full",
                remaining === 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary text-muted-foreground"
              )}>
                <Zap className="w-3 h-3 inline mr-1" />
                {remaining}/{limit} {t("ki.today")}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Message context */}
        <div className="mb-4 px-1">
          <p className="text-xs text-muted-foreground mb-1">{t("ki.replyTo")}</p>
          <p className="text-sm bg-secondary rounded-xl px-3 py-2 line-clamp-2">
            {receivedMessage}
          </p>
        </div>

        {/* Limit reached banner */}
        {limitReached && !response && !loading && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm font-medium text-destructive mb-1">{t("ki.limitTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("ki.limitDesc")}</p>
          </div>
        )}

        {/* Mode buttons */}
        {!response && !loading && !limitReached && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => generate("standard")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4" />
              {t("ki.answers")}
            </button>
            <button
              onClick={() => generate("strategy")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm active:scale-95 transition-transform",
                isPremium
                  ? "bg-gradient-to-r from-primary/80 to-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {isPremium ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {t("ki.strategy")}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{t("ki.thinking")}</p>
          </div>
        )}

        {/* Results */}
        {response && (
          <div className="space-y-3">
            {response.assessment && (
              <div className="bg-primary/5 rounded-xl px-3 py-2 mb-3">
                <p className="text-xs font-semibold text-primary mb-0.5">{t("ki.assessment")}</p>
                <p className="text-sm">{response.assessment}</p>
              </div>
            )}

            {response.answers.map((answer, i) => (
              <div key={i} className="bg-secondary rounded-2xl p-3 space-y-2">
                <p className="text-[0.938rem] leading-relaxed">{answer.text}</p>
                {answer.effect && (
                  <p className="text-xs text-muted-foreground italic">
                    {t("ki.effect")}: {answer.effect}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(answer.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background text-xs font-medium hover:bg-accent/10 transition-colors active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {t("ki.copy")}
                  </button>
                  <button
                    onClick={() => handleUse(answer.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t("ki.use")}
                  </button>
                </div>
              </div>
            ))}

            {remaining !== null && remaining >= 0 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                {remainingText}
              </p>
            )}

            <button
              onClick={() => setResponse(null)}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("ki.retry")}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ClemioKISheet;
