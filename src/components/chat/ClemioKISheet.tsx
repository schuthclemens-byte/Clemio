import { useState } from "react";
import { Sparkles, Copy, Send, ChevronUp, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Answer {
  text: string;
  effect?: string;
}

interface KIResponse {
  assessment?: string;
  answers: Answer[];
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
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<KIResponse | null>(null);
  const [mode, setMode] = useState<"standard" | "strategy">("standard");

  const generate = async (selectedMode: "standard" | "strategy") => {
    if (selectedMode === "strategy" && !isPremium) {
      toast("Du hast dein Limit erreicht. Hol dir Premium für unbegrenzte Antworten.");
      return;
    }

    setLoading(true);
    setResponse(null);
    setMode(selectedMode);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Bitte melde dich an");
        return;
      }

      const { data, error } = await supabase.functions.invoke("clemio-ki", {
        body: {
          receivedMessage,
          chatHistory: chatHistory.slice(-5),
          mode: selectedMode,
        },
      });

      if (error) {
        console.error("Clemio-KI error:", error);
        toast.error("Clemio-KI konnte keine Antworten generieren");
        return;
      }

      setResponse(data as KIResponse);
    } catch (err) {
      console.error("Clemio-KI error:", err);
      toast.error("Fehler bei der Verbindung");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Kopiert ✓");
  };

  const handleUse = (text: string) => {
    onUseSuggestion(text);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            Clemio-KI
          </SheetTitle>
        </SheetHeader>

        {/* Message context */}
        <div className="mb-4 px-1">
          <p className="text-xs text-muted-foreground mb-1">Antwort auf:</p>
          <p className="text-sm bg-secondary rounded-xl px-3 py-2 line-clamp-2">
            {receivedMessage}
          </p>
        </div>

        {/* Mode buttons */}
        {!response && !loading && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => generate("standard")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4" />
              3 Antworten
            </button>
            <button
              onClick={() => generate("strategy")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm active:scale-95 transition-transform",
                isPremium
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {isPremium ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Strategie
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Clemio denkt nach…</p>
          </div>
        )}

        {/* Results */}
        {response && (
          <div className="space-y-3">
            {response.assessment && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2 mb-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Einschätzung</p>
                <p className="text-sm">{response.assessment}</p>
              </div>
            )}

            {response.answers.map((answer, i) => (
              <div key={i} className="bg-secondary rounded-2xl p-3 space-y-2">
                <p className="text-[0.938rem] leading-relaxed">{answer.text}</p>
                {answer.effect && (
                  <p className="text-xs text-muted-foreground italic">
                    Wirkung: {answer.effect}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(answer.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background text-xs font-medium hover:bg-accent/10 transition-colors active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Kopieren
                  </button>
                  <button
                    onClick={() => handleUse(answer.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Verwenden
                  </button>
                </div>
              </div>
            ))}

            {/* Retry */}
            <button
              onClick={() => {
                setResponse(null);
              }}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Nochmal versuchen
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ClemioKISheet;
