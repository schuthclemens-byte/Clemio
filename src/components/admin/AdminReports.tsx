import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Flag, CheckCircle, Eye, Ban, MicOff, MessageSquare, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  reported_by: string;
  reported_by_name: string;
  reported_user_id: string;
  reported_user_name: string;
  report_type: string;
  reason: string;
  description: string | null;
  message_id: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reported_message: { content: string; message_type: string } | null;
}

interface AdminReportsProps {
  onBlockUser: (userId: string) => void;
  onDeleteVoice: (userId: string) => void;
}

const AdminReports = ({ onBlockUser, onDeleteVoice }: AdminReportsProps) => {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "reviewed" | "resolved">("open");
  const [chatLoading, setChatLoading] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "list-reports" },
    });
    if (!error) setReports(data?.reports || []);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const updateReport = async (reportId: string, status: string) => {
    const { error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "update-report", reportId, status },
    });
    if (error) {
      toast.error(tr("Fehler", "Error"));
    } else {
      toast.success(tr("Status aktualisiert", "Status updated"));
      fetchReports();
    }
  };

  const deleteReport = async (reportId: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) {
      toast.error(tr("Fehler beim Löschen", "Delete failed"));
    } else {
      toast.success(tr("Meldung gelöscht", "Report deleted"));
      fetchReports();
    }
  };

  const openPrivateChat = async (targetUserId: string, reportId: string) => {
    setChatLoading(`${reportId}-${targetUserId}`);
    const { data, error } = await supabase.rpc("create_direct_chat" as any, {
      _target_user_id: targetUserId,
    } as any);

    if (error || !data) {
      toast.error(tr("Chat konnte nicht geöffnet werden", "Could not open chat"));
      setChatLoading(null);
      return;
    }

    await supabase.functions.invoke("admin-manage-user", {
      body: { action: "update-report", reportId, status: "reviewed" },
    });
    setChatLoading(null);
    navigate(`/chat/${data}`);
  };

  const filtered = reports.filter((r) => filter === "all" || r.status === filter);

  const reasonLabels: Record<string, string> = {
    abuse: tr("Missbrauch", "Abuse"),
    wrong_voice: tr("Falsche Stimme", "Wrong voice"),
    spam: "Spam",
    harassment: tr("Belästigung", "Harassment"),
    fake_account: "Fake Account",
    inappropriate: tr("Unangemessen", "Inappropriate"),
    other: tr("Sonstiges", "Other"),
  };

  const typeIcons: Record<string, any> = {
    message: MessageSquare,
    voice: MicOff,
    user: Flag,
  };

  const statusColors: Record<string, string> = {
    open: "bg-destructive/20 text-destructive",
    reviewed: "bg-amber-500/20 text-amber-600",
    resolved: "bg-green-500/20 text-green-600",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-2 overflow-x-auto">
        {(["open", "reviewed", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {f === "all" ? tr("Alle", "All") : f === "open" ? tr("Offen", "Open") : f === "reviewed" ? tr("Geprüft", "Reviewed") : tr("Erledigt", "Resolved")}
            {f !== "all" && ` (${reports.filter((r) => r.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          {tr("Keine Reports", "No reports")}
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {filtered.map((r) => {
            const TypeIcon = typeIcons[r.report_type] || Flag;
            return (
              <div key={r.id} className="px-4 py-3 space-y-2">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{r.reported_user_name}</span>
                  <Badge className={`text-[0.6rem] px-1.5 ${statusColors[r.status]}`}>
                    {r.status === "open" ? tr("Offen", "Open") : r.status === "reviewed" ? tr("Geprüft", "Reviewed") : tr("Erledigt", "Resolved")}
                  </Badge>
                  <Badge variant="outline" className="text-[0.6rem] px-1.5">
                    {reasonLabels[r.reason] || r.reason}
                  </Badge>
                  <span className="text-[0.6rem] text-muted-foreground ml-auto">
                    {new Date(r.created_at).toLocaleDateString("de")}
                  </span>
                </div>

                {/* Reporter */}
                <p className="text-xs text-muted-foreground">
                  {tr("Gemeldet von", "Reported by")}: {r.reported_by_name}
                </p>

                {/* Description */}
                {r.description && (
                  <p className="text-sm bg-muted/50 rounded-lg p-2">{r.description}</p>
                )}

                {/* Reported message (ONLY the specific message, not the chat) */}
                {r.reported_message && (
                  <div className="bg-muted/50 rounded-lg p-2 border-l-2 border-destructive/50">
                    <p className="text-[0.6rem] text-muted-foreground mb-1">{tr("Gemeldete Nachricht", "Reported message")}:</p>
                    {r.reported_message.message_type === "audio" ? (
                      <p className="text-xs italic text-muted-foreground">🎤 {tr("Sprachnachricht", "Voice message")}</p>
                    ) : r.reported_message.message_type === "image" ? (
                      <p className="text-xs italic text-muted-foreground">📷 {tr("Bild", "Image")}</p>
                    ) : (
                      <p className="text-sm">{r.reported_message.content}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    disabled={chatLoading === `${r.id}-${r.reported_by}`}
                    onClick={() => openPrivateChat(r.reported_by, r.id)}
                  >
                    {chatLoading === `${r.id}-${r.reported_by}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                    {tr("Reporter schreiben", "Message reporter")}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    disabled={chatLoading === `${r.id}-${r.reported_user_id}`}
                    onClick={() => openPrivateChat(r.reported_user_id, r.id)}
                  >
                    {chatLoading === `${r.id}-${r.reported_user_id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                    {tr("Gemeldeten schreiben", "Message reported")}
                  </Button>
                  {r.status === "open" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => updateReport(r.id, "reviewed")}
                    >
                      <Eye className="w-3 h-3" /> {tr("Als geprüft", "Mark reviewed")}
                    </Button>
                  )}
                  {r.status !== "resolved" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => updateReport(r.id, "resolved")}
                    >
                      <CheckCircle className="w-3 h-3" /> {tr("Erledigt", "Resolved")}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-orange-500 border-orange-500/30"
                    onClick={() => onBlockUser(r.reported_user_id)}
                  >
                    <Ban className="w-3 h-3" /> {tr("Sperren", "Block")}
                  </Button>
                  {r.report_type === "voice" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30"
                      onClick={() => onDeleteVoice(r.reported_user_id)}
                    >
                      <MicOff className="w-3 h-3" /> {tr("Voice löschen", "Delete voice")}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => deleteReport(r.id)}
                  >
                    <Trash2 className="w-3 h-3" /> {tr("Löschen", "Delete")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
