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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, CheckCircle, ChevronDown, Copy, Download, Eye, Loader2, Save, Search, Trash2, X } from "lucide-react";
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
  category: "ui" | "api" | "realtime" | "storage" | "auth" | "push" | "voice" | "unknown";
  severity: "warning" | "error" | "fatal";
  status: "open" | "reviewed" | "resolved";
  admin_note: string | null;
  occurrences: number;
  created_at: string;
  last_seen_at: string;
  total_count?: number;
}

type StatusFilter = "open" | "reviewed" | "resolved" | "all";
type SeverityFilter = "all" | "problematic" | "fatal" | "error" | "warning";
type CategoryFilter = "all" | AppErrorReport["category"];

const AdminErrorReports = () => {
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);
  const [errors, setErrors] = useState<AppErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [routeFilter, setRouteFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const humanizeError = (item: AppErrorReport): string => {
    const text = `${item.title} ${item.message}`.toLowerCase();
    if (text.includes("network") || text.includes("failed to fetch") || text.includes("econn")) {
      return tr(
        "Die Verbindung zum Server ist abgebrochen — Internet oder Backend war kurz nicht erreichbar.",
        "Connection to the server was lost — internet or backend was briefly unreachable."
      );
    }
    if (text.includes("rls") || text.includes("row-level security") || text.includes("permission denied")) {
      return tr(
        "Ein Datenbank-Zugriff wurde abgelehnt — fehlende Berechtigung für diese Aktion.",
        "A database action was rejected — missing permission for this action."
      );
    }
    if (text.includes("microphone") || text.includes("mediadevices") || text.includes("notallowed")) {
      return tr(
        "Mikrofon-Zugriff wurde verweigert oder ist auf dem Gerät nicht verfügbar.",
        "Microphone access was denied or unavailable on the device."
      );
    }
    if (text.includes("notification") || text.includes("push") || text.includes("vapid")) {
      return tr(
        "Push-Benachrichtigung konnte nicht zugestellt werden.",
        "Push notification could not be delivered."
      );
    }
    if (text.includes("elevenlabs") || text.includes("voice") || text.includes("tts")) {
      return tr(
        "Stimm-/Sprachausgabe ist fehlgeschlagen — der Voice-Anbieter hat einen Fehler gemeldet.",
        "Voice/TTS failed — the voice provider returned an error."
      );
    }
    if (text.includes("storage") || text.includes("bucket") || text.includes("upload")) {
      return tr(
        "Eine Datei konnte nicht hoch- oder heruntergeladen werden (Speicher-Bucket).",
        "A file upload or download failed (storage bucket)."
      );
    }
    if (text.includes("auth") || text.includes("session") || text.includes("jwt") || text.includes("token")) {
      return tr(
        "Ein Authentifizierungs-Problem — Sitzung abgelaufen oder Token ungültig.",
        "Authentication problem — session expired or token invalid."
      );
    }
    if (text.includes("typeerror") || text.includes("undefined") || text.includes("null")) {
      return tr(
        "Im UI hat ein Wert gefehlt, den der Code erwartet hat (Programmierfehler).",
        "A value the code expected was missing in the UI (programming error)."
      );
    }
    if (text.includes("realtime") || text.includes("websocket") || text.includes("channel")) {
      return tr(
        "Die Live-Verbindung (Realtime) wurde unterbrochen.",
        "The live connection (realtime) was interrupted."
      );
    }
    return tr(
      "Unbekannter Fehler — Details siehe technische Daten unten.",
      "Unknown error — see technical details below."
    );
  };

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("list_app_error_reports", {
      _status: statusFilter === "all" ? null : statusFilter,
      _severity: severityFilter === "all" ? null : severityFilter,
      _search: debouncedSearch.trim() || null,
      _limit: pageSize,
      _offset: page * pageSize,
      _category: categoryFilter === "all" ? null : categoryFilter,
      _route: routeFilter.trim() || null,
      _source: sourceFilter.trim() || null,
      _from: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : null,
      _to: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : null,
    });
    if (!error) {
      const list = data || [];
      setErrors(list);
      setTotalCount(Number(list[0]?.total_count || 0));
      setNotes(Object.fromEntries(list.map((item: AppErrorReport) => [item.id, item.admin_note || ""])));
    } else {
      toast.error(locale === "de" ? "Fehler konnten nicht geladen werden" : "Could not load errors");
    }
    setLoading(false);
  }, [categoryFilter, debouncedSearch, fromDate, locale, page, routeFilter, severityFilter, sourceFilter, statusFilter, toDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => { setPage(0); }, [categoryFilter, debouncedSearch, fromDate, routeFilter, severityFilter, sourceFilter, statusFilter, toDate]);

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

  const buildSupportTicket = (item: AppErrorReport) => [
    `# Clemio Support-Ticket: ${item.title}`,
    "",
    `Status: ${item.status}`,
    `Schweregrad: ${item.severity}`,
    `Kategorie: ${item.category}`,
    `Route: ${item.route || "—"}`,
    `Plattform: ${item.platform || "—"}`,
    `Betroffener Nutzer: ${item.user_name} (${item.user_id})`,
    `Vorkommen: ${item.occurrences}`,
    `Erstellt: ${new Date(item.created_at).toLocaleString("de")}`,
    `Zuletzt gesehen: ${new Date(item.last_seen_at).toLocaleString("de")}`,
    "",
    "## Message",
    item.message,
    "",
    "## Stack / Details",
    item.stack || JSON.stringify(item.details, null, 2),
    "",
    "## Admin-Notiz",
    notes[item.id] || item.admin_note || "—",
  ].join("\n");

  const copySupportTicket = async (item: AppErrorReport) => {
    await navigator.clipboard.writeText(buildSupportTicket(item));
    toast.success(tr("Support-Ticket kopiert", "Support ticket copied"));
  };

  const downloadSupportTicket = (item: AppErrorReport) => {
    const blob = new Blob([buildSupportTicket(item)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clemio-error-${item.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
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

  const categoryLabels: Record<CategoryFilter, string> = {
    all: tr("Alle Kategorien", "All categories"),
    ui: "UI",
    api: "API",
    realtime: "Realtime",
    storage: "Storage",
    auth: "Auth",
    push: "Push",
    voice: "Voice",
    unknown: tr("Unklar", "Unknown"),
  };

  const severityBadgeClass: Record<AppErrorReport["severity"], string> = {
    warning: "border-primary/30 bg-primary/10 text-primary",
    error: "border-destructive/30 bg-destructive/15 text-destructive",
    fatal: "border-destructive bg-destructive text-destructive-foreground",
  };

  const openCount = errors.filter((item) => item.status === "open").length;
  const reviewedCount = errors.filter((item) => item.status === "reviewed").length;
  const resolvedCount = errors.filter((item) => item.status === "resolved").length;
  const problematicCount = errors.filter((item) => item.severity === "error" || item.severity === "fatal").length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isFiltered = statusFilter !== "open" || severityFilter !== "all" || categoryFilter !== "all" || routeFilter.trim().length > 0 || sourceFilter.trim().length > 0 || fromDate || toDate || search.trim().length > 0;

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
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {(["all", "ui", "api", "realtime", "storage", "auth", "push", "voice", "unknown"] as const).map((key) => (
            <button key={key} onClick={() => setCategoryFilter(key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${categoryFilter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {categoryLabels[key]}
              {key !== "all" && ` (${errors.filter((item) => item.category === key).length})`}
            </button>
          ))}
          {isFiltered && (
            <button onClick={() => { setStatusFilter("open"); setSeverityFilter("all"); setCategoryFilter("all"); setSearch(""); }} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
              {tr("Zurücksetzen", "Reset")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)} placeholder={tr("Route filtern, z. B. /chat", "Filter route, e.g. /chat")} className="h-10 rounded-xl bg-card text-sm" />
          <Input value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} placeholder={tr("Quelle filtern, z. B. console.error", "Filter source, e.g. console.error")} className="h-10 rounded-xl bg-card text-sm" />
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 rounded-xl bg-card text-sm" aria-label={tr("Von Datum", "From date")} />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-10 rounded-xl bg-card text-sm" aria-label={tr("Bis Datum", "To date")} />
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{tr("Treffer", "Results")}: {totalCount}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>{tr("Zurück", "Prev")}</Button>
            <span>{page + 1}/{totalPages}</span>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs" disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>{tr("Weiter", "Next")}</Button>
          </div>
        </div>
      </div>

      {errors.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tr("Keine Fehler für diesen Filter", "No errors for this filter")}</p>
      ) : (
        <div className="divide-y divide-border/50">
          {errors.map((item) => {
            const isOpen = openId === item.id;
            const human = humanizeError(item);
            return (
              <Collapsible
                key={item.id}
                open={isOpen}
                onOpenChange={(open) => setOpenId(open ? item.id : null)}
              >
                <CollapsibleTrigger className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 ${item.severity === "fatal" ? "bg-destructive/5" : ""}`}>
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${item.severity === "warning" ? "text-primary" : "text-destructive"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={`px-1.5 text-[0.6rem] ${severityBadgeClass[item.severity]}`}>
                        {item.severity === "fatal" ? tr("kritisch", "critical") : item.severity === "error" ? tr("Fehler", "error") : tr("Warnung", "warning")}
                      </Badge>
                      <Badge variant="outline" className="px-1.5 text-[0.6rem] uppercase">{categoryLabels[item.category]}</Badge>
                      <Badge variant="outline" className="px-1.5 text-[0.6rem]">{statusLabels[item.status]}</Badge>
                      <span className="text-[0.65rem] text-muted-foreground">
                        {item.user_name} · ×{item.occurrences} · {new Date(item.last_seen_at).toLocaleString("de", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium leading-snug">{human}</p>
                  </div>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 bg-muted/20 px-4 pb-3">
                    <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">{tr("Was ist passiert", "What happened")}</dt>
                        <dd className="font-medium">{human}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{tr("Original-Meldung", "Original message")}</dt>
                        <dd className="break-all font-medium">{item.title}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{tr("Nutzer", "User")}</dt>
                        <dd className="font-medium">{item.user_name}{item.user_phone ? ` · ${item.user_phone}` : ""}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{tr("Route", "Route")}</dt>
                        <dd className="break-all font-medium">{item.route || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{tr("Plattform", "Platform")}</dt>
                        <dd className="font-medium">{item.platform || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{tr("Häufigkeit", "Frequency")}</dt>
                        <dd className="font-medium">{item.occurrences}× · {tr("zuletzt", "last")} {new Date(item.last_seen_at).toLocaleString("de")}</dd>
                      </div>
                    </dl>
                    <p className="rounded-lg bg-muted/50 p-2 text-xs">
                      <span className="font-semibold">{tr("Originaltext", "Raw message")}: </span>{item.message}
                    </p>
                    <details className="rounded-lg border border-border/60 bg-background/40 p-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground">{tr("Technische Details (Stack-Trace)", "Technical details (stack trace)")}</summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[0.65rem]">{item.stack || JSON.stringify(item.details, null, 2)}</pre>
                    </details>
                    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-2">
                      <Textarea value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={tr("Admin-Notiz", "Admin note")} className="min-h-[64px] resize-none bg-background/80 text-xs" />
                      <Button size="sm" variant="outline" className="h-8 px-2" disabled={saving === item.id} onClick={() => updateError(item.id, "reviewed", notes[item.id] || "")}>
                        {saving === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => copySupportTicket(item)}>
                        <Copy className="h-3 w-3" />{tr("Ticket kopieren", "Copy ticket")}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => downloadSupportTicket(item)}>
                        <Download className="h-3 w-3" />{tr("Ticket laden", "Download ticket")}
                      </Button>
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
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminErrorReports;
