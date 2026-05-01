import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Activity,
  ChevronDown,
  Crown,
  Loader2,
  Mic,
  MicOff,
  Search,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

type EventType =
  | "signup"
  | "premium_activated"
  | "premium_cancelled"
  | "voice_cloned"
  | "voice_deleted"
  | "account_deleted"
  | "profile_completed"
  | "first_chat_created";

interface ActivityEntry {
  id: string;
  user_id: string | null;
  event_type: EventType;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user_name: string | null;
  user_phone: string | null;
  user_avatar: string | null;
  total_count?: number;
}

const EVENT_META: Record<EventType, { label: string; icon: typeof Activity; tone: string }> = {
  signup: { label: "Anmeldung", icon: UserPlus, tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  premium_activated: { label: "Premium aktiviert", icon: Crown, tone: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  premium_cancelled: { label: "Premium beendet", icon: Crown, tone: "bg-muted text-muted-foreground border-border" },
  voice_cloned: { label: "Stimme geklont", icon: Mic, tone: "bg-primary/15 text-primary border-primary/30" },
  voice_deleted: { label: "Stimme gelöscht", icon: MicOff, tone: "bg-muted text-muted-foreground border-border" },
  account_deleted: { label: "Konto gelöscht", icon: UserX, tone: "bg-destructive/15 text-destructive border-destructive/30" },
  profile_completed: { label: "Profil vervollständigt", icon: Activity, tone: "bg-muted text-muted-foreground border-border" },
  first_chat_created: { label: "Erster Chat", icon: Activity, tone: "bg-muted text-muted-foreground border-border" },
};

const RANGE_PRESETS: Array<{ key: string; label: string; hours: number | null }> = [
  { key: "1h", label: "1 Std", hours: 1 },
  { key: "24h", label: "24 Std", hours: 24 },
  { key: "7d", label: "7 Tage", hours: 24 * 7 },
  { key: "30d", label: "30 Tage", hours: 24 * 30 },
  { key: "all", label: "Alle", hours: null },
];

const formatDateTime = (iso: string) => new Date(iso).toLocaleString("de");
const formatRelative = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `vor ${hr} Std.`;
  const days = Math.round(hr / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
};

const initials = (name: string | null) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const AdminActivityLog = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<EventType | "all">("all");
  const [range, setRange] = useState<string>("7d");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const pageSize = 25;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(0), [eventType, range, debouncedSearch]);

  const fromIso = useMemo(() => {
    const preset = RANGE_PRESETS.find((p) => p.key === range);
    if (!preset || preset.hours == null) return null;
    return new Date(Date.now() - preset.hours * 3600_000).toISOString();
  }, [range]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("list_user_activity", {
      _event_type: eventType === "all" ? null : eventType,
      _search: debouncedSearch.trim() || null,
      _from: fromIso,
      _to: null,
      _limit: pageSize,
      _offset: page * pageSize,
    });
    if (error) {
      toast.error("Aktivitäten konnten nicht geladen werden");
      setEntries([]);
      setTotalCount(0);
    } else {
      const list = (data || []) as ActivityEntry[];
      setEntries(list);
      setTotalCount(Number(list[0]?.total_count || 0));
    }
    setLoading(false);
  }, [eventType, debouncedSearch, fromIso, page]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isFiltered = eventType !== "all" || range !== "7d" || search.trim().length > 0;

  return (
    <div>
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Aktivitäten</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Wer hat sich angemeldet, Premium aktiviert, Stimme geklont — chronologisch.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 px-4 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nutzer oder Beschreibung suchen"
            className="h-10 rounded-xl bg-card pl-9 pr-9 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Suche löschen"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Zeitbereich</p>
        <div className="flex gap-1 overflow-x-auto">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => setRange(preset.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                range === preset.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Aktion</p>
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setEventType("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              eventType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Alle
          </button>
          {(Object.keys(EVENT_META) as EventType[]).map((key) => (
            <button
              key={key}
              onClick={() => setEventType(key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                eventType === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {EVENT_META[key].label}
            </button>
          ))}
          {isFiltered && (
            <button
              onClick={() => {
                setEventType("all");
                setRange("7d");
                setSearch("");
              }}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Zurücksetzen
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Treffer: {totalCount}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Zurück</Button>
            <span>{page + 1}/{totalPages}</span>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Weiter</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Keine Aktivitäten in diesem Zeitraum.</p>
      ) : (
        <div className="divide-y divide-border/50">
          {entries.map((entry) => {
            const meta = EVENT_META[entry.event_type] ?? EVENT_META.signup;
            const Icon = meta.icon;
            const isOpen = openId === entry.id;
            return (
              <Collapsible
                key={entry.id}
                open={isOpen}
                onOpenChange={(open) => setOpenId(open ? entry.id : null)}
              >
                <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30">
                  <Avatar className="h-9 w-9 rounded-xl">
                    {entry.user_avatar ? <AvatarImage src={entry.user_avatar} alt={entry.user_name || ""} /> : null}
                    <AvatarFallback className="rounded-xl bg-muted text-xs font-semibold">{initials(entry.user_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="outline" className={`px-1.5 text-[0.6rem] ${meta.tone}`}>{meta.label}</Badge>
                      <span className="text-[0.65rem] text-muted-foreground">{formatRelative(entry.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-snug">{entry.description}</p>
                  </div>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 bg-muted/20 px-4 pb-3">
                    <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Nutzer</dt>
                        <dd className="font-medium">{entry.user_name || "—"}{entry.user_phone ? ` · ${entry.user_phone}` : ""}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Zeitpunkt</dt>
                        <dd className="font-medium">{formatDateTime(entry.created_at)}</dd>
                      </div>
                      {Object.entries(entry.metadata || {})
                        .filter(([k]) => k !== "source")
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-muted-foreground">{k}</dt>
                            <dd className="break-all font-medium">{v == null ? "—" : String(v)}</dd>
                          </div>
                        ))}
                    </dl>
                    <details className="rounded-lg border border-border/60 bg-background/40 p-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Technische Rohdaten</summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[0.65rem]">{JSON.stringify({ id: entry.id, event_type: entry.event_type, metadata: entry.metadata }, null, 2)}</pre>
                    </details>
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

export default AdminActivityLog;
