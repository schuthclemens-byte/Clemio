import { Mic2, Lock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SaveVoiceSampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  senderName?: string;
  isPremium: boolean;
}

const SaveVoiceSampleDialog = ({
  open,
  onOpenChange,
  onConfirm,
  senderName,
  isPremium,
}: SaveVoiceSampleDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-[1.75rem] border-border/60 p-0">
        <div className="flex max-h-[85vh] flex-col bg-background">
          <div className="border-b border-border/50 px-6 pb-4 pt-6 pr-14">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {isPremium ? <Mic2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <h3 className="text-lg font-semibold text-foreground">Eigene Stimme erstellen?</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Prüfe kurz die Hinweise und bestätige erst dann das Erstellen.
            </p>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-6">
            <div className="space-y-4 py-5 text-sm leading-relaxed text-muted-foreground">
              <div className="rounded-2xl bg-secondary/50 p-4">
                Diese Sprachnachricht wird als Stimmprobe für{" "}
                <strong className="text-foreground">{senderName || "diesen Kontakt"}</strong> verwendet.
              </div>

              <p>
                Danach können Textnachrichten in dieser Stimme vorgelesen werden. Die Aufnahme wird sicher in der Cloud gespeichert und kann später wieder gelöscht werden.
              </p>

              <p>
                Speichere nur Stimmen, für die du die ausdrückliche Erlaubnis hast. So bleibt die Funktion transparent und datenschutzfreundlich.
              </p>
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t border-border/50 bg-background px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-11 flex-1 rounded-xl bg-secondary text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  "h-11 flex-1 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
                  isPremium
                    ? "gradient-primary text-primary-foreground shadow-soft hover:shadow-elevated"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {isPremium ? "Speichern" : "Weiter"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaveVoiceSampleDialog;