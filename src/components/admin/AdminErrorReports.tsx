import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, Eye, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AppErrorReport {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string | null;
  title: string;
  message: string;
  stack: string | null;
  details: Record<string, unknown>;
  route: string | null;
  platform: string | null;
  severity: "warning" | "error" | "fatal";
  status: "open" | "reviewed" | "resolved";
  admin_note: string | null;
  occurrences: number;
  created_at: string;
  last_seen_at: string;
}

const AdminErrorReports = () => {
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);
  const [errors, setErrors] = useState<AppErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "reviewed" | "resolved" | "all">("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchErrors = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", { body: { action: "list-errors" } });
    if (!error) {
      const list = data?.errors || [];
      setErrors(list);
      setNotes(Object.fromEntries(list.map((item: AppErrorReport) => [item.id, item.admin_note || ""])));
    }
    setLoading(false);
  };

  useEffect(() => { fetchErrors(); }, []);

  const updateError = async (errorId: string, status?: string, adminNote?: string) => {
    setSaving(errorId);
    const { error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "update-error", errorId, status, adminNote },
    });
    setSaving(null);
    if (error) toast.error(tr("Fehler konnte nicht aktualisiert werden", "Could not update error"));
    else {
      toast.success(tr("Fehler aktualisiert", "Error updated"));
      fetchErrors();
    }
  };

  const deleteError = async (errorId: string) => {
    const { error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "delete-error", errorId },
    });
    if (error) toast.error(tr("Fehler konnte nicht gelöscht werden", "Could not delete error"));
    else {
      toast.success(tr("Fehler gelöscht", "Error deleted"));
      fetchErrors();
    }
  };

  const filtered = errors.filter((item) => filter === "all" || item.status === filter);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto px-4 py-2">
        {(["open", "reviewed", "resolved", "all"] as const).map((key) => (
          <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {key === "all" ? tr("Alle", "All") : key === "open" ? tr("Offen", "Open") : key === "reviewed" ? tr("Geprüft", "Reviewed") : tr("Erledigt", "Resolved")}
            {key !== "all" && ` (${errors.filter((item) => item.status === key).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tr("Keine Fehler", "No errors")}</p>
      ) : (
        <div className="divide-y divide-border/50">
          {filtered.map((item) => (
            <div key={item.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                <Badge className="bg-destructive/15 px-1.5 text-[0.6rem] text-destructive">{item.severity}</Badge>
                <Badge variant="outline" className="px-1.5 text-[0.6rem]">{item.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.user_name}{item.user_phone ? ` · ${item.user_phone}` : ""} · {item.route || "—"}</p>
              <p className="rounded-lg bg-muted/50 p-2 text-sm">{item.message}</p>
              <details className="rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">{tr("Technische Details", "Technical details")}</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[0.65rem]">{item.stack || JSON.stringify(item.details, null, 2)}</pre>
              </details>
              <div className="text-[0.65rem] text-muted-foreground">
                {tr("Zuletzt", "Last")}: {new Date(item.last_seen_at).toLocaleString("de")} · {tr("Anzahl", "Count")}: {item.occurrences} · {item.platform || "—"}
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-2">
                <Textarea value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={tr("Admin-Notiz", "Admin note")} className="min-h-[64px] resize-none bg-background/80 text-xs" />
                <Button size="sm" variant="outline" className="h-8 px-2" disabled={saving === item.id} onClick={() => updateError(item.id, "reviewed", notes[item.id] || "")}>
                  {saving === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.status === "open" && <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => updateError(item.id, "reviewed")}><Eye className="h-3 w-3" />{tr("Als geprüft", "Mark reviewed")}</Button>}
                {item.status !== "resolved" && <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => updateError(item.id, "resolved")}><CheckCircle className="h-3 w-3" />{tr("Erledigt", "Resolved")}</Button>}
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => deleteError(item.id)}><Trash2 className="h-3 w-3" />{tr("Löschen", "Delete")}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminErrorReports;