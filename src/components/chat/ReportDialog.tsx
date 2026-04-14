import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportType: "message" | "voice" | "user";
  messageId?: string;
  userName?: string;
}

const REASONS = [
  { value: "abuse", labelDe: "Missbrauch", labelEn: "Abuse" },
  { value: "wrong_voice", labelDe: "Falsche Stimme", labelEn: "Wrong voice" },
  { value: "spam", labelDe: "Spam", labelEn: "Spam" },
  { value: "other", labelDe: "Anderes", labelEn: "Other" },
] as const;

const ReportDialog = ({ open, onOpenChange, reportedUserId, reportType, messageId, userName }: ReportDialogProps) => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const [reason, setReason] = useState<string>("abuse");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from("reports").insert({
      reported_by: user.id,
      reported_user_id: reportedUserId,
      report_type: reportType,
      reason,
      description: description.trim() || null,
      message_id: messageId || null,
    } as any);

    if (error) {
      toast.error(tr("Meldung fehlgeschlagen", "Report failed"));
    } else {
      toast.success(tr("Meldung gesendet", "Report submitted"));
      onOpenChange(false);
      setReason("abuse");
      setDescription("");
    }
    setSubmitting(false);
  };

  const typeLabels: Record<string, string> = {
    message: tr("Nachricht melden", "Report message"),
    voice: tr("Stimme melden", "Report voice"),
    user: tr("Nutzer melden", "Report user"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{typeLabels[reportType]}</DialogTitle>
          {userName && <DialogDescription>{userName}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">{tr("Grund", "Reason")}</label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    reason === r.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {locale === "de" ? r.labelDe : r.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              {tr("Beschreibung (optional)", "Description (optional)")}
            </label>
            <Textarea
              placeholder={tr("Was ist passiert?", "What happened?")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tr("Abbrechen", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} variant="destructive">
            {tr("Melden", "Report")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
