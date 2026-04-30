import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  User as UserIcon,
  Calendar,
  Filter,
  X,
} from "lucide-react";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  target_resource: string | null;
  metadata: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface ProfileLite {
  id: string;
  display_name: string | null;
  phone_number: string | null;
}

// ─── Aktion → Klartext ───────────────────────────────────────────────
const ACTION_LABELS: Record<string, { label: string; describe: (e: AuditEntry, names: Map<string, string>) => string }> = {
  stats: {
    label: "Statistik abgerufen",
    describe: () => "Hat das Admin-Dashboard mit den Gesamt-Zahlen geöffnet.",
  },
  list: {
    label: "Nutzerliste geöffnet",
    describe: (e) => `Hat die komplette Nutzerliste geladen (${(e.metadata as any)?.count ?? "?"} Profile).`,
  },
  "list-reports": {
    label: "Meldungen geöffnet",
    describe: (e) => `Hat alle Meldungen geladen (${(e.metadata as any)?.count ?? "?"} Einträge).`,
  },
  "list-errors": {
    label: "Fehler-Liste geöffnet",
    describe: (e) => `Hat die App-Fehler-Liste geladen (${(e.metadata as any)?.count ?? "?"} Einträge).`,
  },
  "send-test-push": {
    label: "Test-Push gesendet",
    describe: (e, names) =>
      `Hat eine Test-Push-Benachrichtigung an ${nameOrId(e.target_user_id, names)} gesendet (${(e.metadata as any)?.subscriptions ?? 0} Geräte).`,
  },
  "update-report": {
    label: "Meldung bearbeitet",
    describe: (e) => {
      const status = (e.metadata as any)?.reportStatus;
      return `Hat eine Meldung aktualisiert${status ? ` → Status: „${status}"` : ""}.`;
    },
  },
  "update-error": {
    label: "Fehler-Status geändert",
    describe: (e) => {
      const status = (e.metadata as any)?.reportStatus;
      return `Hat einen App-Fehler aktualisiert${status ? ` → Status: „${status}"` : ""}.`;
    },
  },
  "delete-error": {
    label: "Fehler gelöscht",
    describe: () => "Hat einen App-Fehler-Eintrag dauerhaft gelöscht.",
  },
  block: {
    label: "Nutzer gesperrt",
    describe: (e, names) => {
      const reason = (e.metadata as any)?.reason;
      return `Hat ${nameOrId(e.target_user_id, names)} gesperrt${reason ? ` – Grund: „${reason}"` : " (kein Grund angegeben)"}.`;
    },
  },
  unblock: {
    label: "Nutzer entsperrt",
    describe: (e, names) => `Hat ${nameOrId(e.target_user_id, names)} wieder freigegeben.`,
  },
  "set-subscription": {
    label: "Abo geändert",
    describe: (e, names) => {
      const plan = (e.metadata as any)?.plan;
      const until = (e.metadata as any)?.premiumUntil;
      const untilTxt = until ? new Date(until).toLocaleDateString("de-DE") : "?";
      return `Hat das Abo von ${nameOrId(e.target_user_id, names)} auf „${plan}" gesetzt (gültig bis ${untilTxt}).`;
    },
  },
  "reset-password": {
    label: "Passwort zurückgesetzt",
    describe: (e, names) => `Hat das Passwort von ${nameOrId(e.target_user_id, names)} neu gesetzt.`,
  },
  "delete-voice": {
    label: "Stimme gelöscht",
    describe: (e, names) =>
      `Hat das Stimm-Profil von ${nameOrId(e.target_user_id, names)} (inkl. ElevenLabs + Audio-Dateien) gelöscht.`,
  },
  delete: {
    label: "Konto gelöscht",
    describe: (e, names) => `Hat das Konto von ${nameOrId(e.target_user_id, names)} vollständig gelöscht.`,
  },
};

const nameOrId = (id: string | null | undefined, names: Map<string, string>) => {
  if (!id) return "einem unbekannten Nutzer";
  return names.get(id) || `Nutzer ${id.slice(0, 8)}…`;
};

const formatAction = (action: string) => ACTION_LABELS[action]?.label ?? action;

// ─── Zeitbereich-Optionen ───────────────────────────────────────────
const TIME_RANGES = [
  { value: "all", label: "Alle Zeit" },
  { value: "1h", label: "Letzte Stunde" },
  { value: "24h", label: "Letzte 24 Std." },
  { value: "7d", label: "Letzte 7 Tage" },
  { value: "30d", label: "Letzte 30 Tage" },
] as const;

const rangeToMs = (range: string): number | null => {
  switch (range) {
    case "1h": return 60 * 60 * 1000;
    case "24h": return 24 * 60 * 60 * 1000;
    case "7d": return 7 * 24 * 60 * 60 * 1000;
    case "30d": return 30 * 24 * 60 * 60 * 1000;
    default: return null;
  }
};

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        setLoading(false);
        return;
      }
      const list = (data || []) as AuditEntry[];
      setEntries(list);

      // Profile der Admins + Ziel-User nachladen
      const ids = new Set<string>();
      for (const e of list) {
        ids.add(e.admin_user_id);
        if (e.target_user_id) ids.add(e.target_user_id);
      }
      if (ids.size > 0) {
        const { data: profs } = await (supabase as any)
          .from("profiles")
          .select("id, display_name, phone_number")
          .in("id", Array.from(ids));
        const map = new Map<string, string>();
        for (const p of (profs as ProfileLite[]) || []) {
          map.set(p.id, p.display_name || p.phone_number || `Nutzer ${p.id.slice(0, 8)}…`);
        }
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, []);

  const actions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries],
  );

  const admins = useMemo(() => {
    const ids = Array.from(new Set(entries.map((e) => e.admin_user_id)));
    return ids.map((id) => ({ id, name: profiles.get(id) || `Admin ${id.slice(0, 8)}…` }));
  }, [entries, profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rangeMs = rangeToMs(timeRange);
    const cutoff = rangeMs ? Date.now() - rangeMs : 0;

    return entries.filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (adminFilter !== "all" && e.admin_user_id !== adminFilter) return false;
      if (showOnlyErrors && e.success) return false;
      if (cutoff && new Date(e.created_at).getTime() < cutoff) return false;
      if (!q) return true;

      const adminName = (profiles.get(e.admin_user_id) || "").toLowerCase();
      const targetName = e.target_user_id ? (profiles.get(e.target_user_id) || "").toLowerCase() : "";
      const desc = (ACTION_LABELS[e.action]?.describe(e, profiles) || "").toLowerCase();

      return (
        e.action.toLowerCase().includes(q) ||
        adminName.includes(q) ||
        targetName.includes(q) ||
        desc.includes(q) ||
        (e.error_message || "").toLowerCase().includes(q)
      );
    });
  }, [entries, search, actionFilter, adminFilter, timeRange, showOnlyErrors, profiles]);

  const resetFilters = () => {
    setSearch("");
    setActionFilter("all");
    setAdminFilter("all");
    setTimeRange("all");
    setShowOnlyErrors(false);
  };

  const hasActiveFilters =
    search !== "" ||
    actionFilter !== "all" ||
    adminFilter !== "all" ||
    timeRange !== "all" ||
    showOnlyErrors;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter-Leiste */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filter
        </div>

        <Input
          placeholder="Suche nach Beschreibung, Admin, Nutzer, Aktion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="grid gap-2 sm:grid-cols-3">
          {/* Zeitbereich */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Zeitbereich
            </label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Admin */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <UserIcon className="h-3 w-3" /> Admin
            </label>
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Admins</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aktionstyp */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Aktionstyp
            </label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Aktionen</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {formatAction(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyErrors}
              onChange={(e) => setShowOnlyErrors(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Nur fehlgeschlagene Aktionen
          </label>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-3 w-3 mr-1" /> Filter zurücksetzen
            </Button>
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} von {entries.length} Einträgen
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.map((e) => {
          const adminName = profiles.get(e.admin_user_id) || `Admin ${e.admin_user_id.slice(0, 8)}…`;
          const description = ACTION_LABELS[e.action]?.describe(e, profiles) || "Unbekannte Admin-Aktion.";
          const date = new Date(e.created_at).toLocaleString("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
          });

          return (
            <div
              key={e.id}
              className={`rounded-lg border p-3 text-sm transition-colors ${
                e.success
                  ? "border-border bg-card"
                  : "border-destructive/40 bg-destructive/5"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {e.success ? (
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <Badge variant={e.success ? "secondary" : "destructive"}>
                  {formatAction(e.action)}
                </Badge>
                <span className="text-xs text-muted-foreground">{date}</span>
              </div>

              {/* Klartext-Beschreibung */}
              <div className="mt-2 text-foreground">
                <span className="font-medium">{adminName}:</span> {description}
              </div>

              {/* Fehlermeldung im Klartext */}
              {!e.success && e.error_message && (
                <div className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  <div className="font-medium mb-0.5">Problem:</div>
                  <div className="whitespace-pre-wrap break-words">{e.error_message}</div>
                </div>
              )}

              {/* Optionale Roh-Metadaten */}
              {Object.keys(e.metadata || {}).length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    Technische Details
                  </summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[10px]">
                    {JSON.stringify(e.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Keine Einträge gefunden.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;
