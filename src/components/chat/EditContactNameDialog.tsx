import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserRound } from "lucide-react";

interface EditContactNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFirstName: string;
  currentLastName: string;
  onSave: (firstName: string, lastName: string) => void;
}

const EditContactNameDialog = ({
  open,
  onOpenChange,
  currentFirstName,
  currentLastName,
  onSave,
}: EditContactNameDialogProps) => {
  const [firstName, setFirstName] = useState(currentFirstName);
  const [lastName, setLastName] = useState(currentLastName);

  useEffect(() => {
    if (open) {
      setFirstName(currentFirstName);
      setLastName(currentLastName);
    }
  }, [open, currentFirstName, currentLastName]);

  const handleSave = () => {
    onSave(firstName.trim(), lastName.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-[1.75rem] border-border/60 p-0">
        <div className="bg-background">
          <div className="border-b border-border/50 px-6 pb-4 pt-6 pr-14">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Kontaktname bearbeiten</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Nur du siehst diesen Namen.
            </p>
          </div>

          <div className="space-y-3 px-6 py-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Vorname</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="z.B. Mama, Max, Spitzname…"
                className="h-11 w-full rounded-xl bg-secondary px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nachname</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Optional"
                className="h-11 w-full rounded-xl bg-secondary px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="border-t border-border/50 bg-background px-6 py-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-11 flex-1 rounded-xl bg-secondary text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!firstName.trim()}
                className="h-11 flex-1 rounded-xl gradient-primary text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-elevated transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditContactNameDialog;