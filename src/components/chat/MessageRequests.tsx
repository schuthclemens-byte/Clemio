import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Check, X, Shield, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import ReportDialog from "@/components/chat/ReportDialog";

interface RequestPreview {
  invitation_id: string;
  conversation_id: string;
  sender: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  first_message: {
    content: string;
    message_type: string | null;
    created_at: string;
  } | null;
  created_at: string;
}

const MessageRequests = () => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ userId: string; name: string } | null>(null);
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const load = async () => {
    if (!user) return;
    // Get pending 1:1 invitations addressed to me
    const { data: invs, error } = await supabase
      .from("chat_invitations")
      .select("id, conversation_id, conversations:conversation_id(is_group)")
      .eq("invited_user_id", user.id)
      .eq("status", "pending");

    if (error || !invs) {
      setLoading(false);
      return;
    }

    // Filter to 1:1 only (groups are handled by PendingInvitations)
    const oneToOne = invs.filter((i) => (i.conversations as any)?.is_group === false);

    if (oneToOne.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Fetch preview per invitation in parallel
    const previews = await Promise.all(
      oneToOne.map(async (i) => {
        const { data, error: rpcErr } = await supabase.rpc("get_message_request_preview", {
          _invitation_id: i.id,
        });
        if (rpcErr || !data) return null;
        return data as unknown as RequestPreview;
      })
    );

    setRequests(previews.filter((p): p is RequestPreview => !!p));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  // Realtime: refresh when invitation changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("message-requests-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_invitations" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAccept = async (req: RequestPreview) => {
    setActing(req.invitation_id);
    try {
      const { data, error } = await supabase.rpc("accept_message_request", {
        _invitation_id: req.invitation_id,
      });
      if (error) throw error;
      toast.success(tr("Anfrage angenommen", "Request accepted"));
      setRequests((prev) => prev.filter((r) => r.invitation_id !== req.invitation_id));
      navigate(`/chat/${data || req.conversation_id}`);
    } catch (err) {
      console.error("Accept failed", err);
      toast.error(tr("Annehmen fehlgeschlagen", "Failed to accept"));
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (req: RequestPreview) => {
    setActing(req.invitation_id);
    try {
      const { error } = await supabase.rpc("decline_message_request", {
        _invitation_id: req.invitation_id,
      });
      if (error) throw error;
      toast.success(tr("Anfrage abgelehnt", "Request declined"));
      setRequests((prev) => prev.filter((r) => r.invitation_id !== req.invitation_id));
    } catch (err) {
      console.error("Decline failed", err);
      toast.error(tr("Ablehnen fehlgeschlagen", "Failed to decline"));
    } finally {
      setActing(null);
    }
  };

  const handleBlock = async (req: RequestPreview) => {
    if (!confirm(tr(
      `${req.sender.display_name} blockieren? Die Person kann dir nicht mehr schreiben.`,
      `Block ${req.sender.display_name}? They will no longer be able to message you.`
    ))) return;
    setActing(req.invitation_id);
    try {
      const { error } = await supabase.rpc("block_message_request", {
        _invitation_id: req.invitation_id,
        _reason: "message_request",
      });
      if (error) throw error;
      toast.success(tr("Person blockiert", "User blocked"));
      setRequests((prev) => prev.filter((r) => r.invitation_id !== req.invitation_id));
    } catch (err) {
      console.error("Block failed", err);
      toast.error(tr("Blockieren fehlgeschlagen", "Failed to block"));
    } finally {
      setActing(null);
    }
  };

  const previewText = (req: RequestPreview) => {
    if (!req.first_message) return tr("Keine Nachricht", "No message");
    const t = req.first_message.message_type;
    if (t === "audio" || t === "voice") return tr("🎤 Sprachnachricht", "🎤 Voice message");
    if (t === "image") return tr("📷 Bild", "📷 Image");
    if (t === "video") return tr("🎥 Video", "🎥 Video");
    return req.first_message.content || "";
  };

  if (loading || requests.length === 0) return null;

  const visible = expanded ? requests : requests.slice(0, 1);

  return (
    <>
      <div className="px-5 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" />
            {tr("Nachrichtenanfragen", "Message requests")} ({requests.length})
          </p>
          {requests.length > 1 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {expanded ? (
                <>
                  {tr("Weniger", "Less")} <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  {tr("Alle anzeigen", "Show all")} <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </div>

        {visible.map((req) => (
          <div
            key={req.invitation_id}
            className="p-3 rounded-2xl bg-accent/30 border border-border/50 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                {req.sender.avatar_url ? (
                  <img src={req.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  req.sender.display_name[0]?.toUpperCase() || "?"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{req.sender.display_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {previewText(req)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleAccept(req)}
                disabled={acting === req.invitation_id}
                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span className="text-[10px] font-medium">{tr("Annehmen", "Accept")}</span>
              </button>
              <button
                onClick={() => handleDecline(req)}
                disabled={acting === req.invitation_id}
                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span className="text-[10px] font-medium">{tr("Ablehnen", "Decline")}</span>
              </button>
              <button
                onClick={() => handleBlock(req)}
                disabled={acting === req.invitation_id}
                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
              >
                <Shield className="w-4 h-4" />
                <span className="text-[10px] font-medium">{tr("Blockieren", "Block")}</span>
              </button>
              <button
                onClick={() => setReportTarget({ userId: req.sender.id, name: req.sender.display_name })}
                disabled={acting === req.invitation_id}
                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-muted/60 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Flag className="w-4 h-4" />
                <span className="text-[10px] font-medium">{tr("Melden", "Report")}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {reportTarget && (
        <ReportDialog
          open={!!reportTarget}
          onOpenChange={(o) => !o && setReportTarget(null)}
          reportedUserId={reportTarget.userId}
          reportType="user"
          userName={reportTarget.name}
        />
      )}
    </>
  );
};

export default MessageRequests;
