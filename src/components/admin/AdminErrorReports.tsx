import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle, Eye, Loader2, Save, Search, Trash2, X } from "lucide-react";
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

type StatusFilter = "open" | "reviewed" | "resolved" | "all";
type SeverityFilter = "all" | "problematic" | "fatal" | "error" | "warning";

const AdminErrorReports = () => {
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);
  const [errors, setErrors] = useState<AppErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("list_app_error_reports", {
      _status: statusFilter === "all" ? null : statusFilter,
      _severity: severityFilter === "all" || severityFilter === "problematic" ? null : severityFilter,
      _search: debouncedSearch.trim() || null,
      _limit: 100,
      _offset: 0,
    });
    if (!error) {
      const list = data || [];
      setErrors(list);
      setNotes(Object.fromEntries(list.map((item: AppErrorReport) => [item.id, item.admin_note || ""])));
    } else {
      toast.error(locale === "de" ? "Fehler konnten nicht geladen werden" : "Could not load errors");
    }
    setLoading(false);
  }, [debouncedSearch, locale, severityFilter, statusFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

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
    setDeleting(errorId);
    const { error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "delete-error", errorId },
    });
    setDeleting(null);
    if (error) toast.error(tr("Fehler konnte nicht gelöscht werden", "Could not delete error"));
    else {
      toast.success(tr("Fehler gelöscht", "Error deleted"));
      fetchErrors();
    }
  };

  const statusLabels: Record<StatusFilter, string> = {
    open: tr("Offen", "Open"),
    reviewed: tr("Geprüft", "Reviewed"),
    resolved: tr("Gelöst", "Resolved"),
    all: tr("Alle", "All"),
  };

  const severityLabels: Record<SeverityFilter, string> = {
    all: tr("Alle Stufen", "All levels"),
    problematic: tr("Problematisch", "Problematic"),
    fatal: tr("Kritisch", "Critical"),
    error: tr("Fehler", "Error"),
    warning: tr("Warnung", "Warning"),
  };

  const severityBadgeClass: Record<AppErrorReport["severity"], string> = {
    warning: "border-primary/30 bg-primary/10 text-primary",
    error: "border-destructive/30 bg-destructive/15 text-destructive",
    fatal: "border-destructive bg-destructive text-destructive-foreground",
  };

  const matchesSeverity = (item: AppErrorReport) => {
    if (severityFilter === "all") return true;
    if (severityFilter === "problematic") return item.severity === "error" || item.severity === "fatal";
    return item.severity === severityFilter;
  };

  const openCount = errors.filter((item) => item.status === "open").length;
  const reviewedCount = errors.filter((item) => item.status === "reviewed").length;
  const resolvedCount = errors.filter((item) => item.status === "resolved").length;
  const problematicCount = errors.filter((item) => item.severity === "error" || item.severity === "fatal").length;
  const filtered = errors.filter(matchesSeverity);
  const isFiltered = statusFilter !== "open" || severityFilter !== "all" || search.trim().length > 0;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{tr("Fehler-Übersicht", "Error overview")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {tr("Neue App-Fehler nach Status prüfen und bearbeiten.", "Review and manage new app errors by status.")}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-muted/40 px-2 py-2">
              <p className="text-base font-bold text-destructive">{openCount}</p>
              <p className="text-[0.6rem] text-muted-foreground">{tr("Offen", "Open")}</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-2 py-2">
              <p className="text-base font-bold text-primary">{reviewedCount}</p>
              <p className="text-[0.6rem] text-muted-foreground">{tr("Geprüft", "Reviewed")}</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-2 py-2">
              <p className="text-base font-bold text-foreground">{resolvedCount}</p>
              <p className="text-[0.6rem] text-muted-foreground">{tr("Gelöst", "Resolved")}</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-2 py-2">
              <p className="text-base font-bold text-destructive">{problematicCount}</p>
              <p className="text-[0.6rem] text-muted-foreground">{tr("Problem", "Problem")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 px-4 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tr("Betreff oder Message suchen", "Search title or message")}
            className="h-10 rounded-xl bg-card pl-9 pr-9 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground -translate-y-1/2"
              aria-label={tr("Suche löschen", "Clear search")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{tr("Status filtern", "Filter by status")}</p>
        <div className="flex gap-1 overflow-x-auto">
          {(["open", "reviewed", "resolved", "all"] as const).map((key) => (
            <button key={key} onClick={() => setStatusFilter(key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {statusLabels[key]}
              {key !== "all" && ` (${errors.filter((item) => item.status === key).length})`}
            </button>
          ))}
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {(["all", "problematic", "fatal", "error", "warning"] as const).map((key) => (
            <button key={key} onClick={() => setSeverityFilter(key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${severityFilter === key ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>
              {severityLabels[key]}
              {key === "problematic" && ` (${errors.filter((item) => item.severity === "error" || item.severity === "fatal").length})`}
            </button>
          ))}
          {isFiltered && (
            <button onClick={() => { setStatusFilter("open"); setSeverityFilter("all"); setSearch(""); }} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
              {tr("Zurücksetzen", "Reset")}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tr("Keine Fehler für diesen Filter", "No errors for this filter")}</p>
      ) : (
        <div className="divide-y divide-border/50">
          {filtered.map((item) => (
            <div key={item.id} className={`space-y-2 px-4 py-3 ${item.severity === "fatal" ? "bg-destructive/5" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${item.severity === "warning" ? "text-primary" : "text-destructive"}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                <Badge variant="outline" className={`px-1.5 text-[0.6rem] ${severityBadgeClass[item.severity]}`}>{item.severity === "fatal" ? tr("kritisch", "critical") : item.severity === "error" ? tr("Fehler", "error") : tr("Warnung", "warning")}</Badge>
                <Badge variant="outline" className="px-1.5 text-[0.6rem]">{statusLabels[item.status]}</Badge>
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
                {item.status !== "resolved" && <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => updateError(item.id, "resolved")}><CheckCircle className="h-3 w-3" />{tr("Gelöst", "Resolved")}</Button>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-destructive" disabled={deleting === item.id}>
                      {deleting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      {tr("Löschen", "Delete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-h-[80dvh] overflow-y-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{tr("Fehler löschen?", "Delete error?")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {tr("Dieser Fehlereintrag wird dauerhaft aus dem Adminbereich entfernt.", "This error entry will be permanently removed from the admin area.")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tr("Abbrechen", "Cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteError(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {tr("Endgültig löschen", "Delete permanently")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminErrorReports;
