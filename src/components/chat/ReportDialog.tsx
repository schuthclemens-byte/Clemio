import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Flag, ShieldAlert, UserX, ImageOff, MessageSquareWarning, MoreHorizontal } from "lucide-react";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportType: "message" | "voice" | "user";
  messageId?: string;
  userName?: string;
}

const REASONS = [
  { value: "spam", labelDe: "Spam", labelEn: "Spam", icon: ShieldAlert },
  { value: "harassment", labelDe: "Belästigung", labelEn: "Harassment", icon: MessageSquareWarning },
  { value: "fake_account", labelDe: "Fake Account", labelEn: "Fake Account", icon: UserX },
  { value: "inappropriate", labelDe: "Unangemessene Inhalte", labelEn: "Inappropriate Content", icon: ImageOff },
  { value: "other", labelDe: "Sonstiges", labelEn: "Other", icon: MoreHorizontal },
] as const;

const ReportDialog = ({ open, onOpenChange, reportedUserId, reportType, messageId, userName }: ReportDialogProps) => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    setReason("");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);

    const { error } = await supabase.from("reports").insert({
      reported_by: user.id,
      reported_user_id: reportedUserId,
      report_type: reportType,
      reason,
      description: description.trim().slice(0, 500) || null,
      message_id: messageId || null,
    } as any);

    if (error) {
      toast.error(tr("Meldung fehlgeschlagen", "Report failed"));
    } else {
      toast.success(tr("Meldung gesendet – Danke!", "Report submitted – Thank you!"));
      handleClose();
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={handleClose}
      />
      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[71] animate-in slide-in-from-bottom duration-200">
        <div className="mx-3 mb-3 rounded-2xl bg-card border border-border/50 shadow-2xl overflow-hidden max-h-[80dvh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-destructive" />
              <h3 className="text-base font-semibold text-foreground">
                {tr("Melden", "Report")}
              </h3>
            </div>
            {userName && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-7">{userName}</p>
            )}
          </div>

          {/* Reason selection */}
          <div className="px-4 pb-3">
            <p className="text-sm text-muted-foreground mb-2">
              {tr("Warum möchtest du melden?", "Why do you want to report?")}
            </p>
            <div className="space-y-1.5">
              {REASONS.map((r) => {
                const isSelected = reason === r.value;
                const Icon = r.icon;
                return (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${
                      isSelected
                        ? "bg-destructive/10 border border-destructive/30 text-destructive font-medium"
                        : "bg-muted/40 border border-transparent text-foreground active:bg-muted"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    {locale === "de" ? r.labelDe : r.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description only for "Sonstiges" */}
          {reason === "other" && (
            <div className="px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <Textarea
                placeholder={tr("Was ist passiert?", "What happened?")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          )}

          {/* Actions */}
          <div className="px-4 pb-3 flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-xl"
            >
              {tr("Abbrechen", "Cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              variant="destructive"
              className="flex-1 rounded-xl"
            >
              {tr("Absenden", "Submit")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportDialog;
